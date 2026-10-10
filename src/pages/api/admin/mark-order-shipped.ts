import type { APIRoute } from "astro";
import { Resend } from "resend";

import { isPickupDeliveryMethod } from "../../../lib/deliveryMethod";
import { shippingConfirmationHtml } from "../../../lib/emailTemplates/shippingConfirmation";
import { ORDER_STATUS } from "../../../lib/orderStatus";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

type ShippingSnapshot = {
  order_status: string;
  shipping_carrier: string | null;
  shipping_tracking_number: string | null;
  shipping_tracking_url: string | null;
  shipped_at: string | null;
};

export const POST: APIRoute = async ({ request }) => {
  let orderId = "";
  let previousShipping: ShippingSnapshot | null = null;
  let orderUpdated = false;

  try {
    const body = await request.json();

    orderId = String(body.orderId ?? "").trim();
    const carrier = String(body.carrier ?? "").trim();
    const trackingNumber = String(body.trackingNumber ?? "").trim();
    const trackingUrl = String(body.trackingUrl ?? "").trim();

    if (!orderId) {
      return Response.json(
        { success: false, error: "Order ID is required." },
        { status: 400 },
      );
    }

    if (!carrier || !trackingNumber) {
      return Response.json(
        {
          success: false,
          error: "Carrier and tracking number are required.",
        },
        { status: 400 },
      );
    }

    if (trackingUrl) {
      let parsedTrackingUrl: URL;

      try {
        parsedTrackingUrl = new URL(trackingUrl);
      } catch {
        return Response.json(
          { success: false, error: "Enter a valid carrier tracking URL." },
          { status: 400 },
        );
      }

      if (parsedTrackingUrl.protocol !== "https:") {
        return Response.json(
          { success: false, error: "The carrier tracking URL must use HTTPS." },
          { status: 400 },
        );
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    if (isPickupDeliveryMethod(order.delivery_method)) {
      return Response.json(
        {
          success: false,
          error: "Pickup orders cannot be marked as shipped.",
        },
        { status: 400 },
      );
    }

    if (
      order.order_status !== ORDER_STATUS.READY &&
      order.order_status !== ORDER_STATUS.SHIPPED
    ) {
      return Response.json(
        {
          success: false,
          error: "Mark production complete before shipping this order.",
        },
        { status: 409 },
      );
    }

    if (!order.email) {
      return Response.json(
        {
          success: false,
          error: "The order has no customer email address.",
        },
        { status: 400 },
      );
    }

    const apiKey = import.meta.env.RESEND_API_KEY?.trim();
    const fromEmail =
      import.meta.env.ORDER_FROM_EMAIL?.trim() ||
      import.meta.env.QUOTE_FROM_EMAIL?.trim() ||
      import.meta.env.FROM_EMAIL?.trim();
    const baseUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

    if (!apiKey || !fromEmail || !baseUrl) {
      return Response.json(
        {
          success: false,
          error: "Order email settings are incomplete.",
        },
        { status: 500 },
      );
    }

    const alreadySent =
      order.order_status === ORDER_STATUS.SHIPPED &&
      order.shipping_carrier === carrier &&
      order.shipping_tracking_number === trackingNumber &&
      String(order.shipping_tracking_url ?? "") === trackingUrl;

    previousShipping = {
      order_status: String(order.order_status ?? ""),
      shipping_carrier: order.shipping_carrier ?? null,
      shipping_tracking_number: order.shipping_tracking_number ?? null,
      shipping_tracking_url: order.shipping_tracking_url ?? null,
      shipped_at: order.shipped_at ?? null,
    };

    const shippedAt = order.shipped_at ?? new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_carrier: carrier,
        shipping_tracking_number: trackingNumber,
        shipping_tracking_url: trackingUrl || null,
        shipped_at: shippedAt,
        order_status: ORDER_STATUS.SHIPPED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    orderUpdated = true;

    if (!alreadySent) {
      const orderNumber = "LF" + String(order.order_number).padStart(6, "0");
      const orderTrackingUrl = `${baseUrl}/t/${encodeURIComponent(
        order.tracking_token,
      )}`;
      const resend = new Resend(apiKey);
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: order.email,
        subject: `Your order ${orderNumber} has shipped`,
        html: shippingConfirmationHtml(
          order.customer_name || "Customer",
          orderNumber,
          carrier,
          trackingNumber,
          trackingUrl,
          orderTrackingUrl,
        ),
      });

      if (emailError) {
        throw new Error(
          `Resend rejected the shipping email: ${emailError.message}`,
        );
      }
    }

    return Response.json({ success: true, emailSent: !alreadySent });
  } catch (error) {
    if (orderUpdated && previousShipping && orderId) {
      const { error: rollbackError } = await supabaseAdmin
        .from("orders")
        .update({
          ...previousShipping,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (rollbackError) {
        console.error("Unable to roll back failed shipment update:", {
          orderId,
          error: rollbackError.message,
        });
      }
    }

    console.error("Unable to mark order shipped:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save shipping details.",
      },
      { status: 500 },
    );
  }
};
