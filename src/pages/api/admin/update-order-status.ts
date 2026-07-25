import type { APIRoute } from "astro";
import { Resend } from "resend";

import { isPickupDeliveryMethod } from "../../../lib/deliveryMethod";
import { pickupReadyHtml } from "../../../lib/emailTemplates/pickupReady";
import { orderCompletedHtml } from "../../../lib/emailTemplates/orderCompleted";
import { ORDER_STATUS } from "../../../lib/orderStatus";
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

    const orderNumber = `LF${String(order.order_number).padStart(6, "0")}`;
    const deliveryMethod = String(order.delivery_method ?? "").trim();
    const isPickupOrder = isPickupDeliveryMethod(deliveryMethod);
    const shouldSendPickupReadyEmail =
      status === ORDER_STATUS.READY && isPickupOrder;
    const shouldResendPickupReadyEmail =
      shouldSendPickupReadyEmail && previousStatus === ORDER_STATUS.READY;
    const shouldSendCompletionEmail =
      status === ORDER_STATUS.COMPLETED &&
      previousStatus !== ORDER_STATUS.COMPLETED;
    const shouldSendStatusEmail =
      shouldSendPickupReadyEmail || shouldSendCompletionEmail;

    logStatusEvent("log", "Order status update requested", {
      orderId,
      orderNumber,
      previousStatus,
      requestedStatus: status,
      deliveryMethod,
      isPickupOrder,
      shouldSendPickupReadyEmail,
      shouldResendPickupReadyEmail,
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
    }

    let resendEmailId: string | null = null;

    if (shouldSendStatusEmail && emailDetails) {
      const resend = new Resend(emailDetails.apiKey);
      const subject = shouldSendPickupReadyEmail
        ? `Your order ${orderNumber} is ready for pickup`
        : `Your order ${orderNumber} is complete`;

      const html = shouldSendPickupReadyEmail
        ? pickupReadyHtml(
            order.customer_name || "Customer",
            orderNumber,
            emailDetails.pickupAddress,
            emailDetails.pickupPhone,
            emailDetails.trackingUrl,
          )
        : orderCompletedHtml(
            order.customer_name || "Customer",
            orderNumber,
            emailDetails.trackingUrl,
          );

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
        pickupEmailResent: shouldResendPickupReadyEmail,
        resendEmailId,
      });
    }

    return Response.json({
      success: true,
      statusChanged: status !== previousStatus,
      pickupEmailSent: shouldSendPickupReadyEmail,
      pickupEmailResent: shouldResendPickupReadyEmail,
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
