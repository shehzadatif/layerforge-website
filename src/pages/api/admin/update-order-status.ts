import type { APIRoute } from "astro";
import { Resend } from "resend";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { ORDER_STATUS } from "../../../lib/orderStatus";
import { pickupReadyHtml } from "../../../lib/emailTemplates/pickupReady";
import { orderCompletedHtml } from "../../../lib/emailTemplates/orderCompleted";

export const prerender = false;

const validStatuses = new Set<string>(
  Object.values(ORDER_STATUS),
);

export const POST: APIRoute = async ({ request }) => {
  let previousStatus = "";
  let updatedOrderId = "";

  try {
    const body = await request.json();
    const orderId = String(body.orderId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!orderId || !validStatuses.has(status)) {
      return Response.json(
        {
          success: false,
          error: "A valid order and status are required.",
        },
        { status: 400 },
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
        { status: 404 },
      );
    }

    previousStatus = String(order.order_status ?? "");

    const shouldSendPickupReadyEmail =
      status === ORDER_STATUS.READY &&
      previousStatus !== ORDER_STATUS.READY &&
      String(order.delivery_method ?? "").toLowerCase() ===
        "pickup";

    const shouldSendCompletionEmail =
      status === ORDER_STATUS.COMPLETED &&
      previousStatus !== ORDER_STATUS.COMPLETED;

    const shouldSendStatusEmail =
      shouldSendPickupReadyEmail ||
      shouldSendCompletionEmail;

    let emailDetails:
      | {
          apiKey: string;
          fromEmail: string;
          pickupAddress: string;
          trackingUrl: string;
        }
      | undefined;

    if (shouldSendStatusEmail) {
      const apiKey =
        import.meta.env.RESEND_API_KEY?.trim();

      const siteUrl =
        import.meta.env.PUBLIC_SITE_URL
          ?.trim()
          .replace(/\/+$/, "");

      const { data: settings, error: settingsError } =
        await supabaseAdmin
          .from("settings")
          .select("setting_key, setting_value")
          .in("setting_key", [
            "company_address",
            "order_from_email",
          ]);

      if (settingsError) {
        throw new Error(settingsError.message);
      }

      const settingsMap = new Map(
        (settings ?? []).map((setting) => [
          setting.setting_key,
          String(setting.setting_value ?? "").trim(),
        ]),
      );

      const fromEmail =
        import.meta.env.ORDER_FROM_EMAIL?.trim() ||
        settingsMap.get("order_from_email") ||
        import.meta.env.FROM_EMAIL?.trim();

      if (!apiKey || !fromEmail || !siteUrl) {
        throw new Error(
          "Order email settings are incomplete.",
        );
      }

      if (!order.email) {
        throw new Error(
          "The order does not have a customer email address.",
        );
      }

      emailDetails = {
        apiKey,
        fromEmail,
        pickupAddress:
          settingsMap.get("company_address") ?? "",
        trackingUrl:
          `${siteUrl}/t/${encodeURIComponent(
            order.tracking_token,
          )}`,
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    updatedOrderId = orderId;

    if (shouldSendStatusEmail && emailDetails) {
      const orderNumber =
        `LF${String(order.order_number).padStart(6, "0")}`;

      const resend = new Resend(emailDetails.apiKey);
      const subject = shouldSendPickupReadyEmail
        ? `Your order ${orderNumber} is ready for pickup`
        : `Your order ${orderNumber} is complete`;

      const html = shouldSendPickupReadyEmail
        ? pickupReadyHtml(
            order.customer_name || "Customer",
            orderNumber,
            emailDetails.pickupAddress,
            emailDetails.trackingUrl,
          )
        : orderCompletedHtml(
            order.customer_name || "Customer",
            orderNumber,
            emailDetails.trackingUrl,
          );

      const { error: emailError } =
        await resend.emails.send({
          from: emailDetails.fromEmail,
          to: order.email,
          subject,
          html,
        });

      if (emailError) {
        throw new Error(
          `Resend rejected the order status email: ${emailError.message}`,
        );
      }

      console.log("Order status email sent.", {
        orderId,
        orderNumber,
        status,
        recipient: order.email,
      });
    }

    return Response.json({
      success: true,
      pickupEmailSent: shouldSendPickupReadyEmail,
      completionEmailSent: shouldSendCompletionEmail,
    });
  } catch (error) {
    if (updatedOrderId && previousStatus) {
      const { error: rollbackError } = await supabaseAdmin
        .from("orders")
        .update({
          order_status: previousStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedOrderId);

      if (rollbackError) {
        console.error(
          "Unable to roll back order status after email failure:",
          rollbackError,
        );
      }
    }

    console.error("Unable to update order status:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update status.",
      },
      { status: 500 },
    );
  }
};
