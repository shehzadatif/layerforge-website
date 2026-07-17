export function quoteEmailHtml(
  customerName: string,
  quoteNumber: string,
  approvalUrl: string
) {

  return `
  <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto">

    <h1 style="color:#111827">
      Layer Forge
    </h1>

    <p>Hello ${customerName},</p>

    <p>
      Your quote <strong>${quoteNumber}</strong> is ready.
    </p>

    <p>
      Please review your quote using the secure link below.
    </p>

    <p style="margin:40px 0">

      <a
        href="${approvalUrl}"
        style="
          background:#eab308;
          color:#111827;
          padding:16px 28px;
          text-decoration:none;
          border-radius:8px;
          font-weight:bold;
        "
      >
        Review Quote
      </a>

    </p>

    <p>

      Or copy this link into your browser:

      <br><br>

      ${approvalUrl}

    </p>

    <hr>

    <p style="color:#666">

      Layer Forge

      <br>

      https://layerforgecanada.com

    </p>

  </div>
  `;

}