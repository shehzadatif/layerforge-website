function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function phoneHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+") ? `+${digits}` : digits;
}

export function pickupReadyHtml(
  customerName: string,
  orderNumber: string,
  pickupAddress: string,
  pickupPhone: string,
  orderTrackingUrl: string,
) {
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeAddress = escapeHtml(pickupAddress).replace(/\r?\n/g, "<br>");
  const safePhone = escapeHtml(pickupPhone);
  const safePhoneHref = escapeHtml(phoneHref(pickupPhone));
  const safeTrackingUrl = escapeHtml(orderTrackingUrl);
  const pickupMapUrl = escapeHtml(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      pickupAddress.replace(/\s*\r?\n\s*/g, ", "),
    )}`,
  );

  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;line-height:1.6;">
      <h1>Your Layer Forge Canada order is ready for pickup</h1>

      <p>Hello ${safeCustomerName},</p>

      <p>
        Great news—your order <strong>${safeOrderNumber}</strong>
        is complete and ready for pickup.
      </p>

      <div style="margin:24px 0;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0 0 8px;"><strong>Pickup address</strong></p>
        <p style="margin:0;font-size:18px;font-weight:bold;">${safeAddress}</p>
        <p style="margin:12px 0 0;">
          <a href="${pickupMapUrl}">Open the pickup address in Google Maps</a>
        </p>
      </div>

      <div style="margin:24px 0;padding:18px;border:1px solid #fde047;border-radius:12px;background:#fefce8;">
        <p style="margin:0 0 8px;"><strong>Confirm your pickup time</strong></p>
        <p style="margin:0;">
          Please call
          <a href="tel:${safePhoneHref}" style="font-weight:bold;color:#0f172a;">${safePhone}</a>
          to confirm your scheduled pickup time before arriving.
        </p>
      </div>

      <p>
        Please have your order number available when you arrive.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${safeTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          View Order
        </a>
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge Canada.
      </p>
    </div>
  `;
}
