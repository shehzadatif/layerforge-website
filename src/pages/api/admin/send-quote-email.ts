import type { APIRoute } from "astro";
import { Resend } from "resend";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { quoteEmailHtml } from "../../../lib/emailTemplates/quoteEmail";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return Response.json(
        {
          success: false,
          error: "Quote ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: quote, error: quoteError } =
      await supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

    if (quoteError || !quote) {
      return Response.json(
        {
          success: false,
          error: "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!quote.email) {
      return Response.json(
        {
          success: false,
          error: "Customer email is missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (!quote.approval_token) {
      return Response.json(
        {
          success: false,
          error: "Quote approval token is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = import.meta.env.RESEND_API_KEY;
    const fromEmail = import.meta.env.QUOTE_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      throw new Error(
        "RESEND_API_KEY and QUOTE_FROM_EMAIL are required."
      );
    }

    const quoteNumber =
  quote.quote_number
    ? String(quote.quote_number)
    : "Quote";

    const approvalUrl =
      `https://layerforgecanada.com/q/${quote.approval_token}`;

    const resend = new Resend(apiKey);

    const { error: emailError } =
      await resend.emails.send({
        from: fromEmail,
        to: quote.email,
        subject: `Your Layer Forge quote ${quoteNumber}`,
        html: quoteEmailHtml(
          quote.customer_name,
          quoteNumber,
          approvalUrl
        ),
      });

    if (emailError) {
      throw emailError;
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("quotes")
        .update({
          status: "Sent",
        })
        .eq("id", quoteId);

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("Unable to send quote email:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to send quote email.",
      },
      {
        status: 500,
      }
    );
  }
};