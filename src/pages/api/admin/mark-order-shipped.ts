import type { APIRoute } from "astro";
import { Resend } from "resend";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { shippingConfirmationHtml } from "../../../lib/emailTemplates/shippingConfirmation";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const orderId = String(body.orderId ?? "").trim();
    const carrier = String(body.carrier ?? "").trim();
    const trackingNumber = String(
      body.trackingNumber ?? ""
    ).trim();
    const trackingUrl = String(
      body.trackingUrl ?? ""
    ).trim();

    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!carrier || !trackingNumber) {
      return Response.json(
        {
          success: false,
          error:
            "Carrier and tracking number are required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    const alreadySent =
      order.order_status === "Shipped" &&
      order.shipping_carrier === carrier &&
      order.shipping_tracking_number ===
        trackingNumber;

    const shippedAt =
      order.shipped_at ??
      new Date().toISOString();

    const { error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          shipping_carrier: carrier,
          shipping_tracking_number:
            trackingNumber,
          shipping_tracking_url:
            trackingUrl || null,
          shipped_at: shippedAt,
          order_status: "Shipped",
        })
        .eq("id", orderId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!alreadySent && order.email) {
      const apiKey =
        import.meta.env.RESEND_API_KEY;

      const fromEmail =
        import.meta.env.ORDER_FROM_EMAIL ??
        import.meta.env.QUOTE_FROM_EMAIL ??
import.meta.env.FROM_EMAIL

      if (!apiKey || !fromEmail) {
        throw new Error(
          "Resend email settings are missing."
        );
      }

      const baseUrl =
  import.meta.env.PUBLIC_SITE_URL
    ?.trim()
    .replace(/\/+$/, "");

if (!baseUrl) {
  throw new Error(
    "Missing PUBLIC_SITE_URL environment variable.",
  );
}

      const orderNumber =
        "LF" +
        String(order.order_number).padStart(
          6,
          "0"
        );

      const orderTrackingUrl =
        `${baseUrl}/t/${order.tracking_token}`;

      const resend = new Resend(apiKey);

      const { error: emailError } =
        await resend.emails.send({
          from: fromEmail,
          to: order.email,
          subject:
            `Your order ${orderNumber} has shipped`,
          html: shippingConfirmationHtml(
            order.customer_name,
            orderNumber,
            carrier,
            trackingNumber,
            trackingUrl,
            orderTrackingUrl
          ),
        });

      if (emailError) {
        throw emailError;
      }
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Unable to mark order shipped:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to save shipping details.",
      },
      {
        status: 500,
      }
    );
  }
};