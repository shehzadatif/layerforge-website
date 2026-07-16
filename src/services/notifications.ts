import { Resend } from "resend";
import { OrderConfirmationEmail } from "../emails/OrderConfirmation";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendOrderConfirmation(order: {
  customer_name: string;
  email: string;
  order_number: number;
  tracking_token: string;
}) {
  const trackingUrl =
    `${import.meta.env.SITE ?? "http://localhost:4321"}` +
    `/track/${order.tracking_token}`;

  return resend.emails.send({
    from: "Layer Forge <orders@layerforgecanada.com>",
    to: order.email,
    subject: `Your Order LF${String(order.order_number).padStart(6, "0")}`,
    html: OrderConfirmationEmail(
      order.customer_name,
      `LF${String(order.order_number).padStart(6, "0")}`,
      trackingUrl
    ),
  });
}