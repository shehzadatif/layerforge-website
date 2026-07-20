export function orderCompletedHtml(
  customerName: string,
  orderNumber: string,
  orderTrackingUrl: string,
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#0f172a;">
      <h1>Your Layer Forge order is complete</h1>

      <p>Hello ${customerName},</p>

      <p>
        Order <strong>${orderNumber}</strong> has been completed.
        We hope you enjoy your finished order.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${orderTrackingUrl}"
          style="display:inline-block;background:#eab308;color:#0f172a;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;"
        >
          View Order
        </a>
      </p>

      <p>
        If you have any questions about your order, simply reply to this email.
      </p>

      <p style="margin-top:32px;">
        Thank you for choosing Layer Forge. We appreciate your business!
      </p>
    </div>
  `;
}
