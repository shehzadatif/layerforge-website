export function pickupReadyHtml(
  customerName: string,
  orderNumber: string,
  pickupAddress: string,
  orderTrackingUrl: string,
) {
  const addressBlock = pickupAddress
    ? `
      <p style="margin:24px 0;">
        <strong>Pickup location</strong><br>
        ${pickupAddress.replace(/\n/g, "<br>")}
      </p>
    `
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;">
      <h1>Your Layer Forge order is ready for pickup</h1>

      <p>Hello ${customerName},</p>

      <p>
        Great news—your order <strong>${orderNumber}</strong>
        is complete and ready for pickup.
      </p>

      ${addressBlock}

      <p>
        Please have your order number available when you arrive.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${orderTrackingUrl}"
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
