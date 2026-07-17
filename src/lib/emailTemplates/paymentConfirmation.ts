export function paymentConfirmationHtml(
  customerName: string,
  orderNumber: string,
  trackingUrl: string,
  total: number
) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto">

    <h1 style="color:#111827">
      Thank you for your order!
    </h1>

    <p>Hello ${customerName},</p>

    <p>
      We've successfully received your payment.
    </p>

    <table style="margin:30px 0;border-collapse:collapse">

      <tr>
        <td style="padding:8px 20px 8px 0;"><strong>Order</strong></td>
        <td>${orderNumber}</td>
      </tr>

      <tr>
        <td style="padding:8px 20px 8px 0;"><strong>Amount Paid</strong></td>
        <td>CAD $${total.toFixed(2)}</td>
      </tr>

      <tr>
        <td style="padding:8px 20px 8px 0;"><strong>Status</strong></td>
        <td>Payment Received</td>
      </tr>

    </table>

    <p>
      Production will begin shortly.
    </p>

    <p>

      Track your order anytime:

    </p>

    <p>

      <a
        href="${trackingUrl}"
        style="
          background:#eab308;
          color:#111827;
          text-decoration:none;
          padding:14px 28px;
          border-radius:8px;
          font-weight:bold;
        "
      >
        Track Order
      </a>

    </p>

    <hr>

    <p>

      Your invoice is attached to this email.

    </p>

    <p>

      Thank you for choosing Layer Forge.

    </p>

  </div>
  `;
}