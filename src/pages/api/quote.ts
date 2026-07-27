import type { APIRoute } from "astro";

import { sendQuoteEmails } from "../../lib/email";
import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { generateApprovalToken } from "../../lib/tracking";
import {
  THREE_D_QUOTE_ESTIMATE_VERSION,
  THREE_D_QUOTE_SLICER_ESTIMATE_VERSION,
  type ThreeDPrintQuality,
} from "../../lib/threeDQuoteEstimator";
import {
  resolveTurnstileSecretKey,
  TURNSTILE_QUOTE_ACTION,
  verifyTurnstileToken,
} from "../../lib/turnstile";
import { getTurnstileServerEnvironment } from "../../lib/turnstileServer";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

const MAX_QUOTE_FILE_SIZE = 50 * 1024 * 1024;
const MAX_QUOTE_REQUEST_SIZE = 55 * 1024 * 1024;
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
const THREE_D_QUALITY_VALUES = new Set<ThreeDPrintQuality>([
  "draft",
  "standard",
  "fine",
]);
const THREE_D_ESTIMATE_VERSIONS = new Set<string>([
  THREE_D_QUOTE_ESTIMATE_VERSION,
  THREE_D_QUOTE_SLICER_ESTIMATE_VERSION,
]);

class QuoteRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

interface OnlineEstimate {
  version: string;
  low: number;
  high: number;
  midpoint: number;
  materialGramsPerUnit: number;
  printHoursPerUnit: number;
  modelVolumeCm3: number;
  modelSurfaceAreaCm2: number;
  modelDimensionsMm: string;
  modelTriangleCount: number;
}

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

function optionalNumber(
  formData: FormData,
  key: string,
  minimum: number,
  maximum: number,
): number | null {
  const rawValue = String(formData.get(key) ?? "").trim();

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new QuoteRequestError(`${key} is invalid.`);
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

function readOnlineEstimate(
  formData: FormData,
  service: string,
): OnlineEstimate | null {
  if (service !== "3D Printing") {
    return null;
  }

  const version = textValue(formData, "estimateVersion", 80);

  if (!version) {
    return null;
  }

  if (!THREE_D_ESTIMATE_VERSIONS.has(version)) {
    throw new QuoteRequestError(
      "The online estimate version is not supported.",
    );
  }

  const low = optionalNumber(formData, "estimateLow", 0, 1_000_000);
  const high = optionalNumber(formData, "estimateHigh", 0, 1_000_000);
  const midpoint = optionalNumber(
    formData,
    "estimateMidpoint",
    0,
    1_000_000,
  );
  const materialGramsPerUnit = optionalNumber(
    formData,
    "estimateMaterialGrams",
    0,
    1_000_000,
  );
  const printHoursPerUnit = optionalNumber(
    formData,
    "estimatePrintHours",
    0,
    100_000,
  );
  const modelVolumeCm3 = optionalNumber(
    formData,
    "modelVolumeCm3",
    0,
    100_000_000,
  );
  const modelSurfaceAreaCm2 = optionalNumber(
    formData,
    "modelSurfaceAreaCm2",
    0,
    100_000_000,
  );
  const modelDimensionsMm = textValue(formData, "modelDimensionsMm", 120);
  const modelTriangleCount = optionalNumber(
    formData,
    "modelTriangleCount",
    1,
    100_000_000,
  );

  if (
    low === null ||
    high === null ||
    midpoint === null ||
    materialGramsPerUnit === null ||
    printHoursPerUnit === null ||
    modelVolumeCm3 === null ||
    modelSurfaceAreaCm2 === null ||
    modelTriangleCount === null ||
    !modelDimensionsMm ||
    low > midpoint ||
    midpoint > high ||
    !/^\d+(?:\.\d+)?x\d+(?:\.\d+)?x\d+(?:\.\d+)?$/.test(
      modelDimensionsMm,
    )
  ) {
    throw new QuoteRequestError("The online estimate details are incomplete.");
  }

  return {
    version,
    low,
    high,
    midpoint,
    materialGramsPerUnit,
    printHoursPerUnit,
    modelVolumeCm3,
    modelSurfaceAreaCm2,
    modelDimensionsMm,
    modelTriangleCount: Math.round(modelTriangleCount),
  };
}

async function verifyQuoteTurnstile(
  request: Request,
  formData: FormData,
): Promise<void> {
  const turnstileEnvironment = getTurnstileServerEnvironment();
  const secret = resolveTurnstileSecretKey(
    turnstileEnvironment.secretKey,
    turnstileEnvironment.nodeEnvironment,
  );

  if (!secret) {
    console.error("3D quote Turnstile is not configured.");
    throw new QuoteRequestError(
      "Quote submissions are temporarily unavailable.",
      503,
    );
  }

  const token = textValue(
    formData,
    "cf-turnstile-response",
    2048,
    true,
  );
  const requestUrl = new URL(request.url);
  const verification = await verifyTurnstileToken({
    token,
    secret,
    remoteIp: request.headers.get("CF-Connecting-IP") ?? undefined,
    expectedAction: TURNSTILE_QUOTE_ACTION,
    expectedHostname: requestUrl.hostname,
  });

  if (!verification.success) {
    console.warn(
      `3D quote Turnstile rejected: ${JSON.stringify({
        errorCodes: verification.errorCodes,
        hostname: requestUrl.hostname,
      })}`,
    );
    throw new QuoteRequestError(
      "Please complete the security check and try again.",
      403,
    );
  }
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

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_QUOTE_REQUEST_SIZE
  ) {
    return Response.json(
      {
        success: false,
        error: "The quote submission is too large.",
      },
      { status: 413 },
    );
  }

  try {
    const formData = await request.formData();

    /* Silently accept honeypot submissions without storing or emailing them. */
    if (String(formData.get("website") ?? "").trim()) {
      return Response.json({
        success: true,
        redirect: "/quote/success",
      });
    }

    const service = textValue(formData, "service", 80, true);

    if (!ALLOWED_SERVICES.has(service)) {
      throw new QuoteRequestError("Select a valid Layer Forge service.");
    }

    if (service === "3D Printing") {
      await verifyQuoteTurnstile(request, formData);
    }

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
    const modelUnits = textValue(formData, "modelUnits", 20);
    const quality = textValue(formData, "quality", 20);
    const infill = textValue(formData, "infill", 20);
    const engravingMaterial = textValue(formData, "engravingMaterial", 80);
    const engravingMode = textValue(formData, "engravingMode", 40);
    const engravingWidth = textValue(formData, "engravingWidth", 30);
    const engravingHeight = textValue(formData, "engravingHeight", 30);
    const engravingUnits = textValue(formData, "engravingUnits", 10);
    const engravingDetail = textValue(formData, "engravingDetail", 40);
    const engravingLocations = textValue(formData, "engravingLocations", 10);
    const engravingSurface = textValue(formData, "engravingSurface", 20);
    const artworkReadiness = textValue(formData, "artworkReadiness", 40);
    const laserEstimateLow = optionalNumber(
      formData,
      "laserEstimateLow",
      0,
      1_000_000,
    );
    const laserEstimateHigh = optionalNumber(
      formData,
      "laserEstimateHigh",
      0,
      1_000_000,
    );
    const laserEstimateMidpoint = optionalNumber(
      formData,
      "laserEstimateMidpoint",
      0,
      1_000_000,
    );
    const laserEstimateHours = optionalNumber(
      formData,
      "laserEstimateHours",
      0,
      100_000,
    );
    const quantity = Number(formData.get("quantity") ?? 1);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new QuoteRequestError("Enter a valid email address.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
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

    if (
      service === "3D Printing" &&
      quality &&
      !THREE_D_QUALITY_VALUES.has(quality as ThreeDPrintQuality)
    ) {
      throw new QuoteRequestError("Select a valid print quality.");
    }

    if (
      service === "3D Printing" &&
      modelUnits &&
      !["mm", "in"].includes(modelUnits)
    ) {
      throw new QuoteRequestError("Select valid model units.");
    }

    const onlineEstimate = readOnlineEstimate(formData, service);
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;
    let fileUrl = "";

    if (service === "3D Printing" && (!file || file.size <= 0)) {
      throw new QuoteRequestError("Upload your 3D model file.");
    }

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
    const estimateSummary = onlineEstimate
      ? `Online estimate: CAD $${onlineEstimate.low.toFixed(2)}–$${onlineEstimate.high.toFixed(2)} before tax and delivery (preliminary; pending file review)`
      : "";
    const laserEstimateSummary =
      service === "Laser Engraving" &&
      laserEstimateLow !== null &&
      laserEstimateHigh !== null
        ? `Online engraving estimate: CAD $${laserEstimateLow.toFixed(2)}–$${laserEstimateHigh.toFixed(2)} before tax and delivery (preliminary; pending artwork and material review)`
        : "";
    const projectDetailsText = [
      notes && `Notes: ${notes}`,
      itemType && `Item Type: ${itemType}`,
      customItem && `Custom Item: ${customItem}`,
      itemDimensions && `Item Dimensions: ${itemDimensions}`,
      printArea && `Print Area: ${printArea}`,
      units && `Measurement Units: ${units}`,
      modelUnits && `STL Units: ${modelUnits === "in" ? "Inches" : "Millimetres"}`,
      quality && `Print Quality: ${quality}`,
      infill && `Infill: ${infill}%`,
      engravingMaterial && `Engraving Material: ${engravingMaterial}`,
      engravingMode && `Artwork Type: ${engravingMode}`,
      engravingWidth &&
        engravingHeight &&
        `Engraving Size: ${engravingWidth} × ${engravingHeight} ${engravingUnits}`,
      engravingDetail && `Artwork Detail: ${engravingDetail}`,
      engravingLocations && `Engraving Locations: ${engravingLocations}`,
      engravingSurface && `Engraving Surface: ${engravingSurface}`,
      artworkReadiness && `Artwork Readiness: ${artworkReadiness}`,
      dueDate && `Requested Completion: ${dueDate}`,
      estimateSummary,
      laserEstimateSummary,
      `Customer Supplied Item: ${customerSupplied}`,
    ]
      .filter(Boolean)
      .join("\n");
    const projectDetails = {
      ...(modelUnits ? { model_units: modelUnits } : {}),
      ...(quality ? { quality } : {}),
      ...(infill ? { infill_percent: Number(infill) } : {}),
      ...(onlineEstimate
        ? {
            online_estimate: {
              source:
                onlineEstimate.version === THREE_D_QUOTE_SLICER_ESTIMATE_VERSION
                  ? "bambu_studio_slice"
                  : "browser_stl_analysis",
              ...onlineEstimate,
            },
          }
        : {}),
      ...(service === "Laser Engraving" &&
      laserEstimateLow !== null &&
      laserEstimateHigh !== null &&
      laserEstimateMidpoint !== null &&
      laserEstimateHours !== null
        ? {
            laser_engraving_estimate: {
              source: "area_time_estimator",
              low: laserEstimateLow,
              high: laserEstimateHigh,
              midpoint: laserEstimateMidpoint,
              machine_hours: laserEstimateHours,
              material: engravingMaterial,
              artwork_type: engravingMode,
              width: Number(engravingWidth),
              height: Number(engravingHeight),
              units: engravingUnits,
              detail: engravingDetail,
              locations: Number(engravingLocations),
              surface: engravingSurface,
              artwork_readiness: artworkReadiness,
            },
          }
        : {}),
    };

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
      description: projectDetailsText,
      project_details: projectDetails,
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
      onlineEstimate: onlineEstimate
        ? {
            low: onlineEstimate.low,
            high: onlineEstimate.high,
          }
        : undefined,
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
        { status: error.status },
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
