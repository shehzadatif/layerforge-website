export function orderCompletedHtml(
  customerName: string,
  orderNumber: string,
  orderTrackingUrl: string,
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeTrackingUrl = escapeHtml(orderTrackingUrl);

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;">
      <h1>Your Layer Forge Canada order is complete</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        Order <strong>${safeOrderNumber}</strong> has been completed.
        We hope you enjoy your finished order.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${safeTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          View Order
        </a>
      </p>

      <p>
        If you have any questions about your order, simply reply to this email.
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge Canada. We appreciate your business!
      </p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
