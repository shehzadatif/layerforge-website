import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../../../lib/isSameOriginRequest";
import { getOrder } from "../../../../../lib/orders";
import { SHIPPING_RATES, type Province } from "../../../../../lib/shipping";
import {
  createStallionLabel,
  StallionError,
  type StallionPackage,
} from "../../../../../lib/stallion";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const prerender = false;

const LABEL_BUCKET = "shipping-labels";
const MAX_LABEL_BYTES = 5 * 1024 * 1024;

function orderNumber(order: Record<string, unknown>): string {
  return `LF${String(order.order_number ?? "").padStart(6, "0")}`;
}

function packageValue(value: unknown, field: string, maximum: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
    throw new StallionError(
      `${field} must be greater than 0 and no more than ${maximum}.`,
      400,
    );
  }

  return Math.round(parsed * 100) / 100;
}

function packageFromBody(body: Record<string, unknown>): StallionPackage {
  return {
    weight: packageValue(body.weight, "Weight", 200),
    length: packageValue(body.length, "Length", 200),
    width: packageValue(body.width, "Width", 200),
    height: packageValue(body.height, "Height", 200),
  };
}

function packageContents(order: Record<string, unknown>): string {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const names = items
    .map((item) =>
      item && typeof item === "object"
        ? String((item as Record<string, unknown>).product_name ?? "").trim()
        : "",
    )
    .filter(Boolean);

  return (names.join(", ") || "Layer Forge Canada order").slice(0, 191);
}

function labelPath(orderId: string): string {
  return `${orderId}/stallion-label.pdf`;
}

async function existingLabelResponse(
  order: Record<string, unknown>,
): Promise<Response | null> {
  const storedPath = String(order.stallion_label_path ?? "").trim();

  if (!storedPath) return null;

  return Response.json({
    success: true,
    existing: true,
    labelUrl: `/api/admin/orders/${encodeURIComponent(String(order.id))}/stallion-label`,
    trackingNumber: String(order.shipping_tracking_number ?? ""),
    carrier: String(order.shipping_carrier ?? ""),
  });
}

export const POST: APIRoute = async ({ request, params }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  try {
    const id = String(params.id ?? "").trim();

    if (!id) {
      return Response.json(
        { success: false, error: "Order ID is required." },
        { status: 400 },
      );
    }

    const order = (await getOrder(id)) as Record<string, unknown>;
    const existing = await existingLabelResponse(order);

    if (existing) return existing;

    if (String(order.payment_status) !== "Paid") {
      throw new StallionError(
        "A label can only be purchased for a paid order.",
        409,
      );
    }

    if (String(order.delivery_method).toLowerCase() !== "shipping") {
      throw new StallionError(
        "Local-pickup orders do not need a shipping label.",
        409,
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parcel = packageFromBody(body);
    const service = String(
      body.service ?? order.shipping_service ?? "cheapest_tracked",
    ).trim();

    if (!service || service.length > 120) {
      throw new StallionError("Select a valid shipping service.", 400);
    }

    const province = String(order.province ?? "")
      .trim()
      .toUpperCase();

    if (!(province in SHIPPING_RATES)) {
      throw new StallionError(
        "The order does not have a valid Canadian province code.",
        400,
      );
    }

    const result = await createStallionLabel({
      destination: {
        name: String(order.customer_name ?? "").trim(),
        address1: String(order.shipping_address ?? "").trim(),
        address2: String(order.unit ?? "").trim() || undefined,
        city: String(order.city ?? "").trim(),
        provinceCode: province as Province,
        postalCode: String(order.postal_code ?? "").trim(),
        email: String(order.email ?? "").trim() || undefined,
        phone: String(order.phone ?? "").trim() || undefined,
      },
      orderReference: orderNumber(order),
      package: parcel,
      packageContents: packageContents(order),
      service,
    });

    const labelResponse = await fetch(result.labelUrl, {
      headers: {
        Accept: "application/pdf",
        "User-Agent": "LayerForgeCanada-Admin/1.0",
      },
    });

    if (!labelResponse.ok) {
      throw new StallionError(
        "The label was purchased, but its PDF could not be downloaded. Open the shipment in Stallion before retrying.",
        502,
      );
    }

    const contentLength = Number(labelResponse.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > MAX_LABEL_BYTES) {
      throw new StallionError(
        "The returned label PDF is unexpectedly large.",
        502,
      );
    }

    const labelBytes = await labelResponse.arrayBuffer();

    if (
      labelBytes.byteLength === 0 ||
      labelBytes.byteLength > MAX_LABEL_BYTES
    ) {
      throw new StallionError(
        "The returned label PDF could not be saved.",
        502,
      );
    }

    const storedPath = labelPath(id);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(LABEL_BUCKET)
      .upload(storedPath, labelBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new StallionError(
        "The label was purchased, but Layerforge could not save the PDF. Open the shipment in Stallion before retrying.",
        502,
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_carrier: result.carrier,
        shipping_service: result.service,
        shipping_service_name: result.serviceName,
        shipping_tracking_number: result.trackingNumber,
        stallion_shipment_id: result.shipmentId,
        stallion_ship_code: result.shipCode || null,
        stallion_label_path: storedPath,
        stallion_label_cost: result.costCents / 100,
        stallion_label_currency: result.currency,
        stallion_label_created_at: new Date().toISOString(),
        package_weight_lbs: parcel.weight,
        package_length_in: parcel.length,
        package_width_in: parcel.width,
        package_height_in: parcel.height,
      })
      .eq("id", id);

    if (updateError) {
      throw new StallionError(
        "The label was purchased and saved, but the order could not be updated. Open the shipment in Stallion before retrying.",
        502,
      );
    }

    return Response.json({
      success: true,
      existing: false,
      labelUrl: `/api/admin/orders/${encodeURIComponent(id)}/stallion-label`,
      trackingNumber: result.trackingNumber,
      carrier: result.carrier,
      serviceName: result.serviceName,
      cost: result.costCents / 100,
      currency: result.currency,
    });
  } catch (error) {
    console.error("Unable to create Stallion label.", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });

    const status = error instanceof StallionError ? error.status : 500;

    return Response.json(
      {
        success: false,
        error:
          error instanceof StallionError
            ? error.message
            : "Unable to create the Stallion label.",
      },
      { status },
    );
  }
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = String(params.id ?? "").trim();
    const order = (await getOrder(id)) as Record<string, unknown>;
    const storedPath = String(order.stallion_label_path ?? "").trim();

    if (!storedPath) {
      return new Response(
        "No Stallion label has been created for this order.",
        {
          status: 404,
        },
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(LABEL_BUCKET)
      .download(storedPath);

    if (error || !data) {
      throw new Error(error?.message || "Label PDF is unavailable.");
    }

    return new Response(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${orderNumber(order)}-shipping-label.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to load Stallion label.", error);
    return new Response("Unable to load the Stallion label.", { status: 500 });
  }
};
