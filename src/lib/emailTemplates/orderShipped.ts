function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:"
      ? escapeHtml(url.toString())
      : "";
  } catch {
    return "";
  }
}

export function orderShippedHtml(
  customerName: string,
  orderNumber: string,
  orderTrackingUrl: string,
  carrier = "",
  trackingNumber = "",
  carrierTrackingUrl = "",
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeOrderTrackingUrl = safeHttpUrl(orderTrackingUrl);
  const safeCarrier = escapeHtml(carrier.trim());
  const safeTrackingNumber = escapeHtml(trackingNumber.trim());
  const safeCarrierTrackingUrl = safeHttpUrl(carrierTrackingUrl.trim());
  const hasShippingDetails = Boolean(safeCarrier || safeTrackingNumber);

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;line-height:1.6;">
      <h1>Your Layer Forge order has shipped</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        Great news—order <strong>${safeOrderNumber}</strong> has been shipped.
      </p>

      ${
        hasShippingDetails
          ? `
            <div style="margin:24px 0;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
              <p style="margin:0 0 8px;"><strong>Shipping details</strong></p>
              ${safeCarrier ? `<p style="margin:0;">Carrier: ${safeCarrier}</p>` : ""}
              ${safeTrackingNumber ? `<p style="margin:4px 0 0;">Tracking number: ${safeTrackingNumber}</p>` : ""}
              ${
                safeCarrierTrackingUrl
                  ? `<p style="margin:12px 0 0;"><a href="${safeCarrierTrackingUrl}">Track Package</a></p>`
                  : ""
              }
            </div>
          `
          : `
            <p>
              Carrier and tracking details will be added to your order page when available.
            </p>
          `
      }

      <p style="margin:30px 0;">
        <a
          href="${safeOrderTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          View Order
        </a>
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge.
      </p>
    </div>
  `;
}
