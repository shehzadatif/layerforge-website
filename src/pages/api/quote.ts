import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { sendQuoteEmails } from "../../lib/email";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // -------------------------------------------------
    // Upload File (if provided)
    // -------------------------------------------------

    const file = formData.get("file") as File | null;

    let fileUrl = "";

    if (file && file.size > 0) {
      const filename = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("quote-files")
        .upload(filename, file);

      if (uploadError) {
        console.error(uploadError);

        return Response.json(
          {
            success: false,
            error: uploadError.message,
          },
          {
            status: 500,
          }
        );
      }

      fileUrl = filename;
    }

    // -------------------------------------------------
    // Common Fields
    // -------------------------------------------------

    const service = String(formData.get("service") ?? "");

    const projectName = String(formData.get("projectName") ?? "");

    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const company = String(formData.get("company") ?? "");

    const material = String(formData.get("material") ?? "");
    const color = String(formData.get("color") ?? "");

    const quantity = Number(formData.get("quantity") ?? 1);

    const deliveryMethod = String(
      formData.get("deliveryMethod") ?? ""
    );

    const notes = String(formData.get("notes") ?? "");

    // -------------------------------------------------
    // Laser Engraving Fields
    // -------------------------------------------------

    const itemType = String(formData.get("itemType") ?? "");

    const customItem = String(formData.get("customItem") ?? "");

    const customerSupplied =
      formData.get("customerSupplied") ? "Yes" : "No";

    const dueDate = String(formData.get("dueDate") ?? "");

    // -------------------------------------------------
    // UV Printing Fields
    // -------------------------------------------------

    const units = String(formData.get("units") ?? "");

    const itemDimensions = String(
      formData.get("itemDimensions") ?? ""
    );

    const printArea = String(formData.get("printArea") ?? "");

    // -------------------------------------------------
    // Build Description
    // -------------------------------------------------

    const projectDetails = [
      notes && `Notes: ${notes}`,

      itemType && `Item Type: ${itemType}`,

      customItem && `Custom Item: ${customItem}`,

      itemDimensions &&
        `Item Dimensions: ${itemDimensions}`,

      printArea &&
        `Print Area: ${printArea}`,

      units &&
        `Measurement Units: ${units}`,

      dueDate &&
        `Requested Completion: ${dueDate}`,

      `Customer Supplied Item: ${customerSupplied}`,
    ]
      .filter(Boolean)
      .join("\n");

// -------------------------------------------------
// Generate Quote Number
// -------------------------------------------------

const { count } = await supabaseAdmin
  .from("quotes")
  .select("*", {
    count: "exact",
    head: true,
  });

const quoteNumber = `LF-${1001 + (count ?? 0)}`;

    // -------------------------------------------------
    // Save Quote
    // -------------------------------------------------

    const { error } = await supabaseAdmin
      .from("quotes")
      .insert({
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

        status: "New",
      });

    if (error) {
      console.error(error);

      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    // -------------------------------------------------
    // Email Notifications
    // -------------------------------------------------

    await sendQuoteEmails({
      name,
      email,
      service,
      material,
      quantity,
      projectName,
    });

    // -------------------------------------------------
    // Success
    // -------------------------------------------------

    return Response.json({
      success: true,
      redirect: "/quote/success",
    });

  } catch (err) {
    console.error(err);

    return Response.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
};