import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendQuoteEmails(data: {
  name: string;
  email: string;
  service: string;
  material: string;
  quantity: number;
  projectName: string;
}) {

  // Email to Layer Forge
  await resend.emails.send({
    from: "Layer Forge <quotes@layerforgecanada.com>",
    to: ["shehzadatif@gmail.com"], // Replace with your email
    subject: `New Quote Request - ${data.service}`,
    html: `
      <h2>New Quote Request</h2>

      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Service:</strong> ${data.service}</p>
      <p><strong>Project:</strong> ${data.projectName}</p>
      <p><strong>Material:</strong> ${data.material}</p>
      <p><strong>Quantity:</strong> ${data.quantity}</p>

      <hr>

      <p>Login to the Layer Forge admin dashboard to review this quote.</p>
    `,
  });

  // Confirmation email to customer
  await resend.emails.send({
    from: "Layer Forge <quotes@layerforgecanada.com>",
    to: [data.email],
    subject: "We've received your quote request",
    html: `
      <h2>Thank you for your quote request!</h2>

      <p>Hello ${data.name},</p>

      <p>We've successfully received your quote request.</p>

      <p>Our team will review your files and contact you within one business day.</p>

      <p>Thank you for choosing <strong>Layer Forge</strong>.</p>
    `,
  });

}