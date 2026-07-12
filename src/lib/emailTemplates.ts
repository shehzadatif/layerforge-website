export function quoteEmail(data: {
  name: string;
  service: string;
  material: string;
  quantity: number;
  price: number;
}) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Arial;background:#f8fafc;padding:40px;">

    <div style="max-width:650px;margin:auto;background:white;padding:40px;border-radius:12px;">

      <h1 style="color:#f59e0b;">
        Layer Forge
      </h1>

      <p>Hi ${data.name},</p>

      <p>Your quote is ready.</p>

      <hr>

      <p><strong>Service:</strong> ${data.service}</p>

      <p><strong>Material:</strong> ${data.material}</p>

      <p><strong>Quantity:</strong> ${data.quantity}</p>

      <h2 style="margin-top:40px;color:#0f172a;">
        $${data.price.toFixed(2)} CAD
      </h2>

      <p>
        Thank you for choosing Layer Forge.
      </p>

    </div>

  </body>
  </html>
  `;
}