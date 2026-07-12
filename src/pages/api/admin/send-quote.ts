import type { APIRoute } from "astro";
import { Resend } from "resend";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { quoteEmail } from "../../../lib/emailTemplates";

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  const { id } = await request.json();

  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) {
    return new Response(
      JSON.stringify({ success: false, error: "Quote not found." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (quote.quoted_price == null) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Please enter a quoted price before sending the quote.",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
  const quoteHtml = quoteEmail({
    name: quote.name,
    service: quote.service,
    material: quote.material,
    quantity: quote.quantity,
    price: quote.quoted_price ?? 0,
  });

  const { error: emailError } = await resend.emails.send({
    from: "Layer Forge <quotes@layerforgecanada.com>",
    to: quote.email,
    subject: `Your Layer Forge Quote`,
    html: quoteHtml,
  });

  if (emailError) {
    return new Response(
      JSON.stringify({ success: false, error: emailError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  await supabaseAdmin
  .from("quotes")
  .update({
    status: "Quoted",
    reviewed_at: new Date().toISOString(),
  })
  .eq("id", id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};