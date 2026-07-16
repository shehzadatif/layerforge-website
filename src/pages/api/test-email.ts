import type { APIRoute } from "astro";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const GET: APIRoute = async () => {
  try {
    const result = await resend.emails.send({
      from: "Layer Forge <orders@layerforgecanada.com>",
      to: "orders@layerforgecanada.com",
      subject: "Layer Forge Email Test",
      html: `
        <h1>🎉 Success!</h1>
        <p>Your Layer Forge email system is working.</p>
        <p>Next we'll send automatic order notifications.</p>
      `,
    });

    return Response.json(result);
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, error },
      { status: 500 }
    );
  }
};