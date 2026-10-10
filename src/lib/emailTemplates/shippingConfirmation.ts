export function shippingConfirmationHtml(
  customerName: string,
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
  trackingUrl: string,
  orderTrackingUrl: string,
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeCarrier = escapeHtml(carrier);
  const safeTrackingNumber = escapeHtml(trackingNumber);
  const safeTrackingUrl = escapeHtml(trackingUrl);
  const safeOrderTrackingUrl = escapeHtml(orderTrackingUrl);

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;">

      <h1>Your Layer Forge Canada order has shipped</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        Great news—your order <strong>${safeOrderNumber}</strong>
        has been shipped.
      </p>

      <table style="margin:24px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 24px 8px 0;font-weight:bold;">
            Carrier
          </td>
          <td>${safeCarrier}</td>
        </tr>

        <tr>
          <td style="padding:8px 24px 8px 0;font-weight:bold;">
            Tracking Number
          </td>
          <td>${safeTrackingNumber}</td>
        </tr>
      </table>

      ${
        safeTrackingUrl
          ? `
            <p style="margin:30px 0;">
              <a
                href="${safeTrackingUrl}"
                style="
                  display:inline-block;
                  background:#eab308;
                  color:#0f172a;
                  padding:14px 24px;
                  border-radius:10px;
                  text-decoration:none;
                  font-weight:bold;
                "
              >
                Track Package
              </a>
            </p>
          `
          : ""
      }

      <p>
        You can also follow the complete order status on your Layer Forge Canada tracking page:
      </p>

      <p>
        <a href="${safeOrderTrackingUrl}">
          ${safeOrderTrackingUrl}
        </a>
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge Canada.
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
