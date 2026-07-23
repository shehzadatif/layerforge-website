import type Stripe from "stripe";
import { Resend } from "resend";

import { supabaseAdmin } from "./supabaseAdmin";
import { generateTrackingToken } from "./tracking";
import { ORDER_STATUS } from "./orderStatus";
import { generateInvoicePdf } from "./invoicePdf";
import { paymentConfirmationHtml } from "./emailTemplates/paymentConfirmation";
import { adminOrderNotificationHtml } from "./emailTemplates/adminOrderNotification";
import {
  formatEstimatedReadyDate,
  getOrderProductionDays,
  normalizeProductionDays,
} from "./productionEstimate";

export interface CompletedOrder {
  id: string;
  order_number: number;
  customer_name: string;
  email: string;
  phone?: string;
  shipping_address?: string;
  unit?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  created_at: string;
  total: number;
  tracking_token: string;
  delivery_method?: string;
  payment_confirmation_sent_at?: string | null;
  admin_notification_sent_at?: string | null;
  order_items?: Array<{
    product_name: string;
    variant_name?: string;
    material?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    production_days?: number;
  }>;
}

export async function convertPaidQuoteToOrder(
  quoteId: string,
  session: Stripe.Checkout.Session,
): Promise<string> {
  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (quoteError) {
    throw new Error(`Unable to load quote: ${quoteError.message}`);
  }

  if (!quote) {
    throw new Error("Quote not found.");
  }

  /*
   * Stripe may retry webhook deliveries. If this quote has
   * already been converted, return the existing order ID.
   */
  if (quote.order_id) {
    return String(quote.order_id);
  }

  const quantity = Math.max(1, Number(quote.quantity ?? 1));

  const quotedPrice = Number(quote.quoted_price ?? quote.estimated_price ?? 0);

  if (!Number.isFinite(quotedPrice) || quotedPrice < 0) {
    throw new Error("Quote price is invalid.");
  }

  const projectDetails =
    quote.project_details && typeof quote.project_details === "object"
      ? (quote.project_details as Record<string, unknown>)
      : {};

  const storedUnitPrice = projectDetails.unit_price;

  const productionDays = normalizeProductionDays(
    projectDetails.production_days,
  );

  const unitPrice = Number(storedUnitPrice ?? quotedPrice / quantity);

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Quote unit price is invalid.");
  }

  const customerDetails = session.customer_details;

  const address = customerDetails?.address;

  const subtotal = Number(session.amount_subtotal ?? 0) / 100;

  const shipping = Number(session.shipping_cost?.amount_total ?? 0) / 100;

  const tax = Number(session.total_details?.amount_tax ?? 0) / 100;

  const total = Number(session.amount_total ?? 0) / 100;

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? "");

  const trackingToken = generateTrackingToken();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_name: quote.name ?? customerDetails?.name ?? "",

      email: quote.email ?? customerDetails?.email ?? "",

      phone: quote.phone ?? customerDetails?.phone ?? "",

      shipping_address: address?.line1 ?? "",

      unit: address?.line2 ?? "",

      city: address?.city ?? "",

      province: address?.state ?? "",

      postal_code: address?.postal_code ?? "",

      country: address?.country ?? "CA",

      delivery_method: quote.delivery_method || "shipping",

      material_summary: quote.material ?? "",

      subtotal,
      shipping,
      tax,
      total,

      payment_status: "Paid",
      order_status: ORDER_STATUS.NEW,

      stripe_session_id: session.id,

      stripe_payment_intent: paymentIntent,

      tracking_token: trackingToken,
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(
      `Unable to create order: ${orderError?.message ?? "Unknown error"}`,
    );
  }

  const { error: itemError } = await supabaseAdmin.from("order_items").insert({
    order_id: order.id,
    product_id: null,

    product_name: quote.project_name || quote.service || "Custom Quote",

    material: quote.material ?? "",

    quantity,
    unit_price: unitPrice,
    total_price: quotedPrice,
    production_days: productionDays,
  });

  if (itemError) {
    await supabaseAdmin.from("orders").delete().eq("id", order.id);

    throw new Error(`Unable to create order item: ${itemError.message}`);
  }

  const { error: updateQuoteError } = await supabaseAdmin
    .from("quotes")
    .update({
      status: "Converted",
      order_id: order.id,
      converted_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .is("order_id", null);

  if (updateQuoteError) {
    await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);

    await supabaseAdmin.from("orders").delete().eq("id", order.id);

    throw new Error(`Unable to convert quote: ${updateQuoteError.message}`);
  }

  return String(order.id);
}

export async function sendPaymentConfirmation(
  order: CompletedOrder,
): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY?.trim();

  const fromEmail =
    import.meta.env.ORDER_FROM_EMAIL?.trim() ||
    import.meta.env.FROM_EMAIL?.trim();

  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required.");
  }

  if (!fromEmail) {
    throw new Error(
      "ORDER_FROM_EMAIL or FROM_EMAIL environment variable is required.",
    );
  }

  if (!siteUrl) {
    throw new Error("PUBLIC_SITE_URL environment variable is required.");
  }

  const customerEmail = String(order.email ?? "").trim();

  if (!customerEmail) {
    throw new Error("Order customer email is missing.");
  }

  const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;

  let invoiceBase64 = "";
  let invoiceBytes = 0;

  try {
    console.log("Generating invoice PDF.", {
      orderId: order.id,
      recipient: customerEmail,
    });

    const invoicePdf = await generateInvoicePdf(order);

    if (!invoicePdf.length) {
      throw new Error("Invoice PDF generation returned an empty document.");
    }

    invoiceBytes = invoicePdf.length;
    invoiceBase64 = Buffer.from(invoicePdf).toString("base64");
  } catch (invoiceError) {
    /*
     * A PDF problem must not suppress the customer's payment confirmation.
     * The email is sent without an attachment and the failure remains visible
     * in Worker logs for follow-up.
     */
    console.error("Unable to attach the order invoice PDF.", {
      orderId: order.id,
      name: invoiceError instanceof Error ? invoiceError.name : "UnknownError",
      message:
        invoiceError instanceof Error
          ? invoiceError.message
          : String(invoiceError),
    });
  }

  const trackingUrl = `${siteUrl}/t/${encodeURIComponent(
    order.tracking_token,
  )}`;

  const productionDays = getOrderProductionDays(order.order_items);
  const estimatedReadyDate = formatEstimatedReadyDate(
    order.created_at,
    productionDays,
  );

  console.log("Sending payment confirmation.", {
    orderId: order.id,
    orderNumber,
    recipient: customerEmail,
    invoiceBytes,
    invoiceAttached: Boolean(invoiceBase64),
  });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: customerEmail,

    subject: `Payment confirmed - Order ${orderNumber}`,

    html: paymentConfirmationHtml(
      order.customer_name ?? "Customer",
      orderNumber,
      trackingUrl,
      Number(order.total),
      estimatedReadyDate,
      order.delivery_method,
    ),

    ...(invoiceBase64
      ? {
          attachments: [
            {
              filename: `Layer-Forge-Invoice-${orderNumber}.pdf`,
              content: invoiceBase64,
            },
          ],
        }
      : {}),
  });

  if (error) {
    throw new Error(
      `Resend rejected the payment confirmation: ${error.message}`,
    );
  }

  console.log("Payment confirmation sent.", {
    orderId: order.id,
    orderNumber,
    recipient: customerEmail,
    resendEmailId: data?.id,
  });
}

export async function sendAdminOrderNotification(
  order: CompletedOrder,
): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY?.trim();
  const fromEmail =
    import.meta.env.ORDER_FROM_EMAIL?.trim() ||
    import.meta.env.FROM_EMAIL?.trim();
  const adminEmail =
    import.meta.env.ORDER_ADMIN_EMAIL?.trim() || "support@layerforgecanada.com";
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (!apiKey || !fromEmail || !siteUrl) {
    throw new Error(
      "RESEND_API_KEY, an order sender email, and PUBLIC_SITE_URL are required.",
    );
  }

  const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;
  const productionDays = getOrderProductionDays(order.order_items);
  const estimatedReadyDate = formatEstimatedReadyDate(
    order.created_at,
    productionDays,
  );
  const adminOrderUrl = `${siteUrl}/admin/orders/${encodeURIComponent(order.id)}`;
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `New paid order ${orderNumber} - CAD $${Number(order.total).toFixed(2)}`,
    html: adminOrderNotificationHtml(
      order,
      orderNumber,
      adminOrderUrl,
      estimatedReadyDate,
    ),
  });

  if (error) {
    throw new Error(
      `Resend rejected the admin order notification: ${error.message}`,
    );
  }
}
