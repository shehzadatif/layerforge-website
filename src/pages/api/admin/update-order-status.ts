import type { APIRoute } from "astro";
import { Resend } from "resend";

import { isPickupDeliveryMethod } from "../../../lib/deliveryMethod";
import { orderCompletedHtml } from "../../../lib/emailTemplates/orderCompleted";
import { orderInProgressHtml } from "../../../lib/emailTemplates/orderInProgress";
import { orderShippedHtml } from "../../../lib/emailTemplates/orderShipped";
import { pickupReadyHtml } from "../../../lib/emailTemplates/pickupReady";
import { ORDER_STATUS } from "../../../lib/orderStatus";
import { getOrderStatusEmailKind } from "../../../lib/orderStatusEmail";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const validStatuses = new Set<string>(Object.values(ORDER_STATUS));

function logStatusEvent(
  level: "log" | "warn" | "error",
  event: string,
  details: Record<string, unknown>,
) {
  console[level](`${event}: ${JSON.stringify(details)}`);
}

export const POST: APIRoute = async ({ request }) => {
  let previousStatus = "";
  let previousShippedAt: string | null = null;
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

    const { data: order, error: orderError } = await supabaseAdmin
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
    previousShippedAt = order.shipped_at ? String(order.shipped_at) : null;

    const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;
    const deliveryMethod = String(order.delivery_method ?? "").trim();
    const isPickupOrder = isPickupDeliveryMethod(deliveryMethod);
    const statusEmailKind = getOrderStatusEmailKind({
      previousStatus,
      requestedStatus: status,
      isPickupOrder,
    });
    const shouldSendInProgressEmail = statusEmailKind === "in_progress";
    const shouldSendPickupReadyEmail = statusEmailKind === "pickup_ready";
    const shouldResendPickupReadyEmail =
      shouldSendPickupReadyEmail && previousStatus === ORDER_STATUS.READY;
    const shouldSendShippedEmail = statusEmailKind === "shipped";
    const shouldResendShippedEmail =
      shouldSendShippedEmail && previousStatus === ORDER_STATUS.SHIPPED;
    const shouldSendCompletionEmail = statusEmailKind === "completed";
    const shouldSendStatusEmail = statusEmailKind !== null;

    logStatusEvent("log", "Order status update requested", {
      orderId,
      orderNumber,
      previousStatus,
      requestedStatus: status,
      deliveryMethod,
      isPickupOrder,
      statusEmailKind,
      shouldSendInProgressEmail,
      shouldSendPickupReadyEmail,
      shouldResendPickupReadyEmail,
      shouldSendShippedEmail,
      shouldResendShippedEmail,
      shouldSendCompletionEmail,
    });

    if (status === ORDER_STATUS.READY && !isPickupOrder) {
      logStatusEvent("warn", "Pickup-ready email skipped", {
        orderId,
        orderNumber,
        deliveryMethod,
        reason: "delivery_method_not_recognized_as_pickup",
      });
    }

    let emailDetails:
      | {
          apiKey: string;
          fromEmail: string;
          pickupAddress: string;
          pickupPhone: string;
          trackingUrl: string;
        }
      | undefined;

    if (shouldSendStatusEmail) {
      const apiKey = import.meta.env.RESEND_API_KEY?.trim();
      const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "company_address",
          "company_phone",
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
        throw new Error("Order email settings are incomplete.");
      }

      if (!order.email) {
        throw new Error("The order does not have a customer email address.");
      }

      const pickupAddress = settingsMap.get("company_address") ?? "";
      const pickupPhone = settingsMap.get("company_phone") ?? "";

      if (shouldSendPickupReadyEmail && (!pickupAddress || !pickupPhone)) {
        throw new Error(
          "Add the exact pickup address and scheduling phone number in Admin Settings before marking this pickup order ready.",
        );
      }

      emailDetails = {
        apiKey,
        fromEmail,
        pickupAddress,
        pickupPhone,
        trackingUrl: `${siteUrl}/t/${encodeURIComponent(order.tracking_token)}`,
      };
    }

    if (status !== previousStatus) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          order_status: status,
          updated_at: now,
          ...(status === ORDER_STATUS.SHIPPED
            ? { shipped_at: previousShippedAt ?? now }
            : {}),
        })
        .eq("id", orderId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      updatedOrderId = orderId;
    }

    let resendEmailId: string | null = null;

    if (shouldSendStatusEmail && emailDetails) {
      const resend = new Resend(emailDetails.apiKey);
      let subject: string;
      let html: string;

      if (statusEmailKind === "in_progress") {
        subject = `Your order ${orderNumber} is now in production`;
        html = orderInProgressHtml(
          order.customer_name || "Customer",
          orderNumber,
          emailDetails.trackingUrl,
        );
      } else if (statusEmailKind === "pickup_ready") {
        subject = `Your order ${orderNumber} is ready for pickup`;
        html = pickupReadyHtml(
          order.customer_name || "Customer",
          orderNumber,
          emailDetails.pickupAddress,
          emailDetails.pickupPhone,
          emailDetails.trackingUrl,
        );
      } else if (statusEmailKind === "shipped") {
        subject = `Your order ${orderNumber} has shipped`;
        html = orderShippedHtml(
          order.customer_name || "Customer",
          orderNumber,
          emailDetails.trackingUrl,
          String(order.shipping_carrier ?? ""),
          String(order.shipping_tracking_number ?? ""),
          String(order.shipping_tracking_url ?? ""),
        );
      } else if (statusEmailKind === "completed") {
        subject = `Your order ${orderNumber} is complete`;
        html = orderCompletedHtml(
          order.customer_name || "Customer",
          orderNumber,
          emailDetails.trackingUrl,
        );
      } else {
        throw new Error("Unable to determine the order status email type.");
      }

      const { data: emailData, error: emailError } = await resend.emails.send({
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

      resendEmailId = emailData?.id ?? null;

      logStatusEvent("log", "Order status email sent", {
        orderId,
        orderNumber,
        requestedStatus: status,
        deliveryMethod,
        statusEmailKind,
        pickupEmailResent: shouldResendPickupReadyEmail,
        shippedEmailResent: shouldResendShippedEmail,
        resendEmailId,
      });
    }

    return Response.json({
      success: true,
      statusChanged: status !== previousStatus,
      inProgressEmailSent: shouldSendInProgressEmail,
      pickupEmailSent: shouldSendPickupReadyEmail,
      pickupEmailResent: shouldResendPickupReadyEmail,
      shippedEmailSent: shouldSendShippedEmail,
      shippedEmailResent: shouldResendShippedEmail,
      completionEmailSent: shouldSendCompletionEmail,
      resendEmailId,
      ...(status === ORDER_STATUS.READY && !isPickupOrder
        ? {
            pickupEmailSkippedReason:
              "The order delivery method is not recognized as local pickup.",
          }
        : {}),
    });
  } catch (error) {
    if (updatedOrderId && previousStatus) {
      const { error: rollbackError } = await supabaseAdmin
        .from("orders")
        .update({
          order_status: previousStatus,
          shipped_at: previousShippedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedOrderId);

      if (rollbackError) {
        logStatusEvent("error", "Unable to roll back order status", {
          orderId: updatedOrderId,
          previousStatus,
          error: rollbackError.message,
        });
      }
    }

    logStatusEvent("error", "Unable to update order status", {
      orderId: updatedOrderId || undefined,
      previousStatus: previousStatus || undefined,
      error: error instanceof Error ? error.message : String(error),
    });

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
