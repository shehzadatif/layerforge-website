export function quoteEmailHtml(
  customerName: string,
  quoteNumber: string,
  approvalUrl: string,
) {
  const logoUrl =
    "https://layerforge-website.shehzadatif.workers.dev/images/pdf.png";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Your Layer Forge Quote</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="padding:40px 16px;"
  >
    <tr>
      <td align="center">
        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            max-width:640px;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 2px 12px rgba(0,0,0,0.08);
          "
        >
          <tr>
            <td
              align="center"
              style="padding:40px 40px 24px;"
            >
              <img
                src="${logoUrl}"
                alt="Layer Forge"
                style="
                  display:block;
                  max-width:220px;
                  width:100%;
                  height:auto;
                  margin:0 auto 24px;
                "
              >

              <h1
                style="
                  margin:0;
                  color:#111827;
                  font-size:30px;
                  line-height:1.2;
                "
              >
                Your Quote Is Ready
              </h1>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:0 40px 40px;
                font-size:16px;
                line-height:1.7;
              "
            >
              <p>
                Hello ${customerName},
              </p>

              <p>
                Thank you for choosing
                <strong>Layer Forge</strong>.
                Your quote
                <strong>${quoteNumber}</strong>
                is ready for review.
              </p>

              <p>
                Please review and approve your quote using the secure link below.
              </p>

              <div
                style="
                  margin:40px 0;
                  text-align:center;
                "
              >
                <a
                  href="${approvalUrl}"
                  style="
                    display:inline-block;
                    background:#eab308;
                    color:#111827;
                    padding:16px 34px;
                    text-decoration:none;
                    border-radius:8px;
                    font-size:16px;
                    font-weight:bold;
                  "
                >
                  Review Quote
                </a>
              </div>

              <p>
                If the button does not work, copy and paste this link into your browser:
              </p>

              <p
                style="
                  color:#2563eb;
                  word-break:break-all;
                "
              >
                ${approvalUrl}
              </p>

              <hr
                style="
                  margin:40px 0;
                  border:0;
                  border-top:1px solid #e5e7eb;
                "
              >

              <p
                style="
                  color:#6b7280;
                  font-size:14px;
                  line-height:1.6;
                "
              >
                Taxes and shipping charges, where applicable, are calculated during secure checkout.
              </p>

              <p style="margin-top:28px;">
                <strong>Layer Forge</strong><br>
                layerforgecanada.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}