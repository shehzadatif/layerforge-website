import type { APIRoute } from "astro";

import { sendQuoteEmails } from "../../lib/email";
import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { generateApprovalToken } from "../../lib/tracking";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

const MAX_QUOTE_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_SERVICES = new Set([
  "3D Printing",
  "Laser Engraving",
  "UV Printing",
]);
const ALLOWED_FILE_EXTENSIONS = new Set([
  "3mf",
  "ai",
  "dxf",
  "eps",
  "jpeg",
  "jpg",
  "obj",
  "pdf",
  "png",
  "step",
  "stl",
  "stp",
  "svg",
  "webp",
]);

class QuoteRequestError extends Error {}

function textValue(
  formData: FormData,
  key: string,
  maxLength: number,
  required = false,
): string {
  const value = String(formData.get(key) ?? "").trim();

  if (required && !value) {
    throw new QuoteRequestError(`${key} is required.`);
  }

  if (value.length > maxLength) {
    throw new QuoteRequestError(`${key} is too long.`);
  }

  return value;
}

function getFileExtension(file: File): string {
  return (
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      {
        success: false,
        error: "Invalid request origin.",
      },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const service = textValue(formData, "service", 80, true);
    const submittedProjectName = textValue(formData, "projectName", 160);
    const name = textValue(formData, "name", 120, true);
    const email = textValue(formData, "email", 254, true).toLowerCase();
    const phone = textValue(formData, "phone", 40);
    const company = textValue(formData, "company", 160);
    const material = textValue(formData, "material", 120);
    const color = textValue(formData, "color", 120);
    const deliveryMethod = textValue(formData, "deliveryMethod", 40);
    const notes = textValue(formData, "notes", 5000);
    const itemType = textValue(formData, "itemType", 160);
    const customItem = textValue(formData, "customItem", 160);
    const dueDate = textValue(formData, "dueDate", 40);
    const units = textValue(formData, "units", 40);
    const itemDimensions = textValue(formData, "itemDimensions", 160);
    const printArea = textValue(formData, "printArea", 160);
    const quantity = Number(formData.get("quantity") ?? 1);

    if (!ALLOWED_SERVICES.has(service)) {
      throw new QuoteRequestError("Select a valid Layer Forge service.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new QuoteRequestError("Enter a valid email address.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw new QuoteRequestError("Quantity must be between 1 and 10,000.");
    }

    const allowedDeliveryMethods = new Set([
      "",
      "Pickup",
      "Local Delivery",
      "Shipping",
    ]);

    if (!allowedDeliveryMethods.has(deliveryMethod)) {
      throw new QuoteRequestError("Select a valid delivery method.");
    }

    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;
    let fileUrl = "";

    if (file && file.size > 0) {
      const extension = getFileExtension(file);

      if (
        file.size > MAX_QUOTE_FILE_SIZE ||
        !ALLOWED_FILE_EXTENSIONS.has(extension)
      ) {
        throw new QuoteRequestError(
          "Upload a supported design file no larger than 50 MB.",
        );
      }

      const storagePath =
        `${service.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/` +
        `${crypto.randomUUID()}.${extension}`;
      const fileBytes = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from("quote-files")
        .upload(storagePath, fileBytes, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("Unable to upload quote file.", {
          service,
          extension,
          size: file.size,
          error: uploadError,
        });

        throw new Error("Quote file upload failed.");
      }

      fileUrl = storagePath;
    }

    const customerSupplied = formData.get("customerSupplied") ? "Yes" : "No";
    const projectName =
      submittedProjectName || customItem || itemType || `${service} Project`;
    const projectDetails = [
      notes && `Notes: ${notes}`,
      itemType && `Item Type: ${itemType}`,
      customItem && `Custom Item: ${customItem}`,
      itemDimensions && `Item Dimensions: ${itemDimensions}`,
      printArea && `Print Area: ${printArea}`,
      units && `Measurement Units: ${units}`,
      dueDate && `Requested Completion: ${dueDate}`,
      `Customer Supplied Item: ${customerSupplied}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { count, error: countError } = await supabaseAdmin
      .from("quotes")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (countError) {
      throw new Error(countError.message);
    }

    const quoteNumber = `LF-${1001 + (count ?? 0)}`;
    const approvalToken = generateApprovalToken();
    const { error: insertError } = await supabaseAdmin.from("quotes").insert({
      service,
      quote_number: quoteNumber,
      project_name: projectName,
      name,
      email,
      phone,
      company,
      material,
      color,
      quantity,
      delivery_method: deliveryMethod,
      description: projectDetails,
      file_url: fileUrl,
      approval_token: approvalToken,
      status: "New",
    });

    if (insertError) {
      if (fileUrl) {
        await supabaseAdmin.storage.from("quote-files").remove([fileUrl]);
      }

      throw new Error(insertError.message);
    }

    await sendQuoteEmails({
      name,
      email,
      service,
      material,
      quantity,
      projectName,
    });

    return Response.json({
      success: true,
      redirect: "/quote/success",
    });
  } catch (error) {
    if (error instanceof QuoteRequestError) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    console.error("Unable to submit quote request.", {
      error,
    });

    return Response.json(
      {
        success: false,
        error: "Unable to submit your quote request.",
      },
      { status: 500 },
    );
  }
};
