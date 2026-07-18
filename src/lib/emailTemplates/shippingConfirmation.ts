export function shippingConfirmationHtml(
  customerName: string,
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
  trackingUrl: string,
  orderTrackingUrl: string
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;">

      <h1>Your Layer Forge order has shipped</h1>

      <p>Hello ${customerName},</p>

      <p>
        Great news—your order <strong>${orderNumber}</strong>
        has been shipped.
      </p>

      <table style="margin:24px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 24px 8px 0;font-weight:bold;">
            Carrier
          </td>
          <td>${carrier}</td>
        </tr>

        <tr>
          <td style="padding:8px 24px 8px 0;font-weight:bold;">
            Tracking Number
          </td>
          <td>${trackingNumber}</td>
        </tr>
      </table>

      ${
        trackingUrl
          ? `
            <p style="margin:30px 0;">
              <a
                href="${trackingUrl}"
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
        You can also follow the complete order status on your Layer Forge tracking page:
      </p>

      <p>
        <a href="${orderTrackingUrl}">
          ${orderTrackingUrl}
        </a>
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge.
      </p>

    </div>
  `;
}