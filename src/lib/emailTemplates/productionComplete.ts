function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function productionCompleteHtml(
  customerName: string,
  orderNumber: string,
  orderTrackingUrl: string,
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeTrackingUrl = escapeHtml(orderTrackingUrl);

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;line-height:1.6;">
      <h1>Production is complete for your Layer Forge Canada order</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        Printing and production for order <strong>${safeOrderNumber}</strong>
        are complete. We are preparing your order for shipment now.
      </p>

      <p>
        We will email your carrier and tracking details as soon as the package
        has been shipped.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${safeTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          View Order Progress
        </a>
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge Canada.
      </p>
    </div>
  `;
}
