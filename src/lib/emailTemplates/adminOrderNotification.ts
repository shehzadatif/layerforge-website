import { formatPacificDateTime } from "../dateUtils";

type AdminOrderNotification = {
  order_number: number;
  customer_name: string;
  email: string;
  phone?: string;
  delivery_method?: string;
  shipping_address?: string;
  unit?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  total: number;
  created_at: string;
  order_items?: Array<{
    product_name: string;
    variant_name?: string;
    material?: string;
    quantity: number;
    total_price: number;
    production_days?: number;
  }>;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function adminOrderNotificationHtml(
  order: AdminOrderNotification,
  orderNumber: string,
  adminOrderUrl: string,
  estimatedReadyDate?: string | null,
) {
  const deliveryMethod =
    String(order.delivery_method ?? "shipping").toLowerCase() === "pickup"
      ? "Local Pickup"
      : "Shipping";

  const address = [
    order.shipping_address,
    order.unit ? `Unit ${order.unit}` : "",
    order.city,
    order.province,
    order.postal_code,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");

  const itemRows = (order.order_items ?? [])
    .map(
      (item) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(item.product_name)}</strong><br>
            ${item.variant_name ? `<span style="color:#374151;">Variant: ${escapeHtml(item.variant_name)}</span><br>` : ""}
            <span style="color:#6b7280;">${escapeHtml(item.material || "-")}</span>
          </td>
          <td style="padding:10px;text-align:center;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.quantity)}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;">CAD $${Number(item.total_price).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#111827;">
      <div style="border-radius:12px 12px 0 0;background:#0f172a;padding:24px;color:#ffffff;">
        <div style="font-size:13px;font-weight:bold;letter-spacing:1.5px;color:#facc15;">NEW PAID ORDER</div>
        <h1 style="margin:8px 0 0;font-size:28px;">${escapeHtml(orderNumber)}</h1>
      </div>

      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:6px 16px 6px 0;"><strong>Customer</strong></td><td>${escapeHtml(order.customer_name)}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;"><strong>Email</strong></td><td>${escapeHtml(order.email)}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;"><strong>Phone</strong></td><td>${escapeHtml(order.phone || "-")}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;"><strong>Placed</strong></td><td>${escapeHtml(formatPacificDateTime(order.created_at))}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;"><strong>Delivery</strong></td><td>${deliveryMethod}</td></tr>
          ${address ? `<tr><td style="padding:6px 16px 6px 0;"><strong>Address</strong></td><td>${address}</td></tr>` : ""}
          ${estimatedReadyDate ? `<tr><td style="padding:6px 16px 6px 0;"><strong>Estimated ${deliveryMethod === "Local Pickup" ? "pickup" : "ready to ship"}</strong></td><td>${escapeHtml(estimatedReadyDate)}</td></tr>` : ""}
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px;text-align:left;">Product</th>
              <th style="padding:10px;text-align:center;">Qty</th>
              <th style="padding:10px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div style="margin:20px 0;text-align:right;font-size:20px;font-weight:bold;">
          Total paid: CAD $${Number(order.total).toFixed(2)}
        </div>

        <a href="${escapeHtml(adminOrderUrl)}" style="display:inline-block;border-radius:8px;background:#facc15;padding:14px 24px;color:#111827;text-decoration:none;font-weight:bold;">
          Open Order in Admin
        </a>
      </div>
    </div>
  `;
}
