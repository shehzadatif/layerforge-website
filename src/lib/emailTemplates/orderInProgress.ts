function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function orderInProgressHtml(
  customerName: string,
  orderNumber: string,
  orderTrackingUrl: string,
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeTrackingUrl = escapeHtml(orderTrackingUrl);

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;line-height:1.6;">
      <h1>Your Layer Forge order is now in production</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        We&apos;ve started working on order <strong>${safeOrderNumber}</strong>.
        You can follow its progress using the link below.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${safeTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          Track Order
        </a>
      </p>

      <p>
        We&apos;ll continue working carefully to complete your order.
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge.
      </p>
    </div>
  `;
}
