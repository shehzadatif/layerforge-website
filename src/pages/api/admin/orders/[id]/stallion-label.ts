import type { APIRoute } from "astro";
import { PDFDocument } from "pdf-lib";

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
const MAX_PACKAGES = 20;

interface StoredPackage extends StallionPackage {
  id: string;
  packageNumber: number;
  service: string;
  labelPath: string;
  trackingNumber: string;
  shipmentId: string;
  carrier: string;
  serviceName: string;
  cost: number;
}

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

function packagesFromBody(body: Record<string, unknown>): StallionPackage[] {
  const packages = Array.isArray(body.packages) ? body.packages : [body];
  if (packages.length < 1 || packages.length > MAX_PACKAGES) {
    throw new StallionError(
      `An order must have between 1 and ${MAX_PACKAGES} packages.`,
      400,
    );
  }

  return packages.map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new StallionError(`Package ${index + 1} is invalid.`, 400);
    }
    const parcel = value as Record<string, unknown>;
    return {
      weight: packageValue(parcel.weight, `Package ${index + 1} weight`, 200),
      length: packageValue(parcel.length, `Package ${index + 1} length`, 200),
      width: packageValue(parcel.width, `Package ${index + 1} width`, 200),
      height: packageValue(parcel.height, `Package ${index + 1} height`, 200),
    };
  });
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

function labelPath(orderId: string, packageNumber: number): string {
  return `${orderId}/package-${packageNumber}-stallion-label.pdf`;
}

function storedPackages(order: Record<string, unknown>): StoredPackage[] {
  const rows = Array.isArray(order.order_shipping_packages)
    ? order.order_shipping_packages
    : [];
  return rows
    .flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      return [
        {
          id: String(row.id ?? ""),
          packageNumber: Number(row.package_number),
          weight: Number(row.weight_lbs),
          length: Number(row.length_in),
          width: Number(row.width_in),
          height: Number(row.height_in),
          service: String(row.shipping_service ?? ""),
          labelPath: String(row.label_path ?? ""),
          trackingNumber: String(row.tracking_number ?? ""),
          shipmentId: String(row.stallion_shipment_id ?? ""),
          carrier: String(row.shipping_carrier ?? ""),
          serviceName: String(row.shipping_service_name ?? ""),
          cost: Number(row.label_cost ?? 0),
        },
      ];
    })
    .sort((left, right) => left.packageNumber - right.packageNumber);
}

async function replaceUnlabelledPackagePlan(
  orderId: string,
  packages: StallionPackage[],
  service: string,
): Promise<StoredPackage[]> {
  const { error: deleteError } = await supabaseAdmin
    .from("order_shipping_packages")
    .delete()
    .eq("order_id", orderId)
    .is("label_path", null);
  if (deleteError) throw new StallionError(deleteError.message, 500);

  const { data, error } = await supabaseAdmin
    .from("order_shipping_packages")
    .insert(
      packages.map((parcel, index) => ({
        order_id: orderId,
        package_number: index + 1,
        weight_lbs: parcel.weight,
        length_in: parcel.length,
        width_in: parcel.width,
        height_in: parcel.height,
        shipping_service: service,
      })),
    )
    .select();
  if (error) throw new StallionError(error.message, 500);
  return storedPackages({ order_shipping_packages: data });
}

async function downloadLabel(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "LayerForgeCanada-Admin/1.0",
    },
  });
  if (!response.ok) {
    throw new StallionError(
      "A label was purchased, but its PDF could not be downloaded. Open the shipment in Stallion before retrying.",
      502,
    );
  }
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_LABEL_BYTES) {
    throw new StallionError(
      "The returned label PDF is unexpectedly large.",
      502,
    );
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_LABEL_BYTES) {
    throw new StallionError("The returned label PDF could not be saved.", 502);
  }
  return bytes;
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
    if (!id) throw new StallionError("Order ID is required.", 400);
    const order = (await getOrder(id)) as Record<string, unknown>;
    if (String(order.payment_status) !== "Paid") {
      throw new StallionError(
        "A label can only be purchased for a paid order.",
        409,
      );
    }
    if (String(order.delivery_method).toLowerCase() !== "shipping") {
      throw new StallionError(
        "Local-pickup orders do not need shipping labels.",
        409,
      );
    }
    if (
      storedPackages(order).length === 0 &&
      String(order.stallion_label_path ?? "").trim()
    ) {
      return Response.json({
        success: true,
        existing: true,
        labelUrl: `/api/admin/orders/${encodeURIComponent(id)}/stallion-label`,
        packageCount: 1,
        trackingNumbers: [String(order.shipping_tracking_number ?? "")].filter(
          Boolean,
        ),
        carrier: String(order.shipping_carrier ?? ""),
        cost: Number(order.stallion_label_cost ?? 0),
        currency: String(order.stallion_label_currency ?? "CAD"),
      });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const requestedPackages = packagesFromBody(body);
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

    let packages = storedPackages(order);
    const hasPurchasedLabel = packages.some((parcel) => parcel.labelPath);
    if (!hasPurchasedLabel) {
      packages = await replaceUnlabelledPackagePlan(
        id,
        requestedPackages,
        service,
      );
    } else if (packages.length !== requestedPackages.length) {
      throw new StallionError(
        "Packages cannot be added or removed after label purchasing begins.",
        409,
      );
    } else {
      for (const [index, parcel] of packages.entries()) {
        if (parcel.labelPath) continue;
        const requested = requestedPackages[index];
        const { error } = await supabaseAdmin
          .from("order_shipping_packages")
          .update({
            weight_lbs: requested.weight,
            length_in: requested.length,
            width_in: requested.width,
            height_in: requested.height,
            shipping_service: service,
            updated_at: new Date().toISOString(),
          })
          .eq("id", parcel.id);
        if (error) throw new StallionError(error.message, 500);
        Object.assign(parcel, requested, { service });
      }
    }

    for (const parcel of packages) {
      if (parcel.labelPath) continue;
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
        orderReference: `${orderNumber(order)}-${parcel.packageNumber}`,
        package: parcel,
        packageContents: packageContents(order),
        service: parcel.service || service,
      });
      const labelBytes = await downloadLabel(result.labelUrl);
      const storedPath = labelPath(id, parcel.packageNumber);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(LABEL_BUCKET)
        .upload(storedPath, labelBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) {
        throw new StallionError(
          `Package ${parcel.packageNumber} was purchased, but its PDF could not be saved. Open the shipment in Stallion before retrying.`,
          502,
        );
      }
      const { error: updateError } = await supabaseAdmin
        .from("order_shipping_packages")
        .update({
          shipping_carrier: result.carrier,
          shipping_service: result.service,
          shipping_service_name: result.serviceName,
          tracking_number: result.trackingNumber,
          stallion_shipment_id: result.shipmentId,
          stallion_ship_code: result.shipCode || null,
          label_path: storedPath,
          label_cost: result.costCents / 100,
          label_currency: result.currency,
          label_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", parcel.id);
      if (updateError) {
        throw new StallionError(
          `Package ${parcel.packageNumber} was purchased and saved, but the order could not be updated.`,
          502,
        );
      }
    }

    const refreshed = (await getOrder(id)) as Record<string, unknown>;
    const completedPackages = storedPackages(refreshed);
    const trackingNumbers = completedPackages
      .map((parcel) => parcel.trackingNumber)
      .filter(Boolean);
    const totalCost = completedPackages.reduce(
      (total, parcel) => total + parcel.cost,
      0,
    );
    const first = completedPackages[0];
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_carrier: first?.carrier || order.shipping_carrier,
        shipping_service: first?.service || service,
        shipping_service_name:
          first?.serviceName || order.shipping_service_name,
        shipping_tracking_number: trackingNumbers.join(", "),
        stallion_shipment_id: first?.shipmentId || null,
        stallion_label_path: first?.labelPath || null,
        stallion_label_cost: totalCost,
        stallion_label_currency: "CAD",
        stallion_label_created_at: new Date().toISOString(),
        package_weight_lbs: first?.weight ?? null,
        package_length_in: first?.length ?? null,
        package_width_in: first?.width ?? null,
        package_height_in: first?.height ?? null,
      })
      .eq("id", id);
    if (orderUpdateError)
      throw new StallionError(orderUpdateError.message, 500);

    return Response.json({
      success: true,
      labelUrl: `/api/admin/orders/${encodeURIComponent(id)}/stallion-label`,
      packageCount: completedPackages.length,
      trackingNumbers,
      carrier: first?.carrier || "",
      cost: totalCost,
      currency: "CAD",
    });
  } catch (error) {
    console.error("Unable to create Stallion labels.", {
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
            : "Unable to create the Stallion labels.",
      },
      { status },
    );
  }
};

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const id = String(params.id ?? "").trim();
    const order = (await getOrder(id)) as Record<string, unknown>;
    const requestedPackage = Number(
      new URL(request.url).searchParams.get("package"),
    );
    let paths = storedPackages(order)
      .filter(
        (parcel) =>
          parcel.labelPath &&
          (!Number.isInteger(requestedPackage) ||
            parcel.packageNumber === requestedPackage),
      )
      .map((parcel) => parcel.labelPath);
    if (paths.length === 0) {
      const legacyPath = String(order.stallion_label_path ?? "").trim();
      if (legacyPath) paths = [legacyPath];
    }
    if (paths.length === 0) {
      return new Response("No Stallion labels exist for this order.", {
        status: 404,
      });
    }

    const blobs = await Promise.all(
      paths.map(async (path) => {
        const { data, error } = await supabaseAdmin.storage
          .from(LABEL_BUCKET)
          .download(path);
        if (error || !data)
          throw new Error(error?.message || "Label PDF is unavailable.");
        return data;
      }),
    );

    let output: Uint8Array;
    if (blobs.length === 1) {
      output = new Uint8Array(await blobs[0].arrayBuffer());
    } else {
      const combined = await PDFDocument.create();
      for (const blob of blobs) {
        const source = await PDFDocument.load(await blob.arrayBuffer());
        const pages = await combined.copyPages(source, source.getPageIndices());
        pages.forEach((page) => combined.addPage(page));
      }
      output = await combined.save();
    }

    return new Response(output as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${orderNumber(order)}-shipping-labels.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to load Stallion labels.", error);
    return new Response("Unable to load the Stallion labels.", { status: 500 });
  }
};
