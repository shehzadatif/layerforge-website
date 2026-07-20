import type { APIRoute } from "astro";
import { Resend } from "resend";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { quoteEmailHtml } from "../../../lib/emailTemplates/quoteEmail";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let quoteId = "";

  try {
    const body = await request.json();

    quoteId = String(body?.quoteId ?? "").trim();

    if (!quoteId) {
      return Response.json(
        {
          success: false,
          error: "Quote ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: quote, error: quoteError } =
      await supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

    if (quoteError || !quote) {
      console.warn("Quote not found for email delivery.", {
        quoteId,
        error: quoteError,
      });

      return Response.json(
        {
          success: false,
          error: "Quote not found.",
        },
        {
          status: 404,
        },
      );
    }

    const customerEmail = String(
      quote.email ?? "",
    ).trim();

    if (!customerEmail) {
      return Response.json(
        {
          success: false,
          error: "Customer email is missing.",
        },
        {
          status: 400,
        },
      );
    }

    const approvalToken = String(
      quote.approval_token ?? "",
    ).trim();

    if (!approvalToken) {
      return Response.json(
        {
          success: false,
          error: "Quote approval token is missing.",
        },
        {
          status: 400,
        },
      );
    }

    const apiKey =
      import.meta.env.RESEND_API_KEY?.trim();

    const fromEmail =
      import.meta.env.QUOTE_FROM_EMAIL?.trim() ||
      import.meta.env.FROM_EMAIL?.trim();

    const siteUrl =
      import.meta.env.PUBLIC_SITE_URL
        ?.trim()
        .replace(/\/+$/, "");

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is required.",
      );
    }

    if (!fromEmail) {
      throw new Error(
        "A sender email environment variable is required.",
      );
    }

    if (!siteUrl) {
      throw new Error(
        "PUBLIC_SITE_URL environment variable is required.",
      );
    }

    const quoteNumber = quote.quote_number
      ? String(quote.quote_number)
      : "Quote";

    const approvalUrl =
      `${siteUrl}/q/${encodeURIComponent(
        approvalToken,
      )}`;

    const logoUrl = `${siteUrl}/images/pdf/logo.png`;

    const resend = new Resend(apiKey);

    const { error: emailError } =
      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject:
          `Your Layer Forge quote ${quoteNumber}`,

        html: quoteEmailHtml(
          quote.customer_name ??
            quote.name ??
            "Customer",
          quoteNumber,
          approvalUrl,
        ),

        attachments: [
          {
            path: logoUrl,
            filename: "layer-forge-logo.png",
            contentId: "layer-forge-logo",
          },
        ],
      });

    if (emailError) {
      throw new Error(
        `Resend rejected the quote email: ${emailError.message}`,
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("quotes")
        .update({
          status: "Sent",
        })
        .eq("id", quoteId);

    if (updateError) {
      throw new Error(
        `Quote email was sent, but its status could not be updated: ${updateError.message}`,
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("Unable to send quote email.", {
      quoteId: quoteId || undefined,
      error,
    });

    return Response.json(
      {
        success: false,
        error: "Unable to send quote email.",
      },
      {
        status: 500,
      },
    );
  }
};