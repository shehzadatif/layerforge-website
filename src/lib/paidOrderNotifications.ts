import { markOrderNotificationSent } from "./orders";
import {
  sendAdminOrderNotification,
  sendPaymentConfirmation,
  type CompletedOrder,
} from "./quoteToOrder";

type PaidOrderSource = "Shop" | "Quote";

function getErrorDetails(error: unknown) {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

export async function sendPaidOrderNotifications(
  order: CompletedOrder,
  source: PaidOrderSource,
): Promise<void> {
  let notificationFailed = false;

  if (!order.payment_confirmation_sent_at) {
    try {
      await sendPaymentConfirmation(order);
      await markOrderNotificationSent(order.id, "customer");
    } catch (error) {
      console.error(`Unable to send ${source} payment confirmation email.`, {
        orderId: order.id,
        ...getErrorDetails(error),
      });

      notificationFailed = true;
    }
  } else {
    console.log(`Order ${order.id} customer confirmation already sent`);
  }

  if (!order.admin_notification_sent_at) {
    try {
      await sendAdminOrderNotification(order);
      await markOrderNotificationSent(order.id, "admin");
    } catch (error) {
      console.error(
        `Unable to send ${source} admin order notification email.`,
        {
          orderId: order.id,
          ...getErrorDetails(error),
        },
      );

      notificationFailed = true;
    }
  } else {
    console.log(`Order ${order.id} admin notification already sent`);
  }

  if (notificationFailed) {
    throw new Error(
      `One or more notifications for order ${order.id} could not be sent.`,
    );
  }
}
