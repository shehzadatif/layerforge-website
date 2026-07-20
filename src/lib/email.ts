import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

export async function sendQuoteEmails(data: {
  name: string;
  email: string;
  service: string;
  material: string;
  quantity: number;
  projectName: string;
}) {
  const fromEmail =
    import.meta.env.QUOTE_FROM_EMAIL?.trim() ||
    import.meta.env.FROM_EMAIL?.trim() ||
    "Layer Forge <quotes@layerforgecanada.com>";

  const notificationEmail =
    import.meta.env.QUOTE_TO_EMAIL?.trim() || "shehzadatif@gmail.com";

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeService = escapeHtml(data.service);
  const safeProjectName = escapeHtml(data.projectName);
  const safeMaterial = escapeHtml(data.material);

  // Email to Layer Forge
  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: `New Quote Request - ${data.service}`,
    html: `
      <h2>New Quote Request</h2>

      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Service:</strong> ${safeService}</p>
      <p><strong>Project:</strong> ${safeProjectName}</p>
      <p><strong>Material:</strong> ${safeMaterial}</p>
      <p><strong>Quantity:</strong> ${data.quantity}</p>

      <hr>

      <p>Login to the Layer Forge admin dashboard to review this quote.</p>
    `,
  });

  // Confirmation email to customer
  await resend.emails.send({
    from: fromEmail,
    to: [data.email],
    subject: "We've received your quote request",
    html: `
      <h2>Thank you for your quote request!</h2>

      <p>Hello ${safeName},</p>

      <p>We've successfully received your quote request.</p>

      <p>Our team will review your files and contact you within one business day.</p>

      <p>Thank you for choosing <strong>Layer Forge</strong>.</p>
    `,
  });
}
