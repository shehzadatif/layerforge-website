import type { APIRoute } from "astro";
import { Resend } from "resend";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const CUSTOMER_DECISIONS = new Set(["Approved", "Rejected"]);
const DECIDABLE_STATUSES = ["Sent", "Draft", "New"];

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
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

async function sendQuoteResponseNotification(
  quote: Record<string, unknown>,
  status: string,
): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY?.trim();
  const fromEmail =
    import.meta.env.QUOTE_FROM_EMAIL?.trim() ||
    import.meta.env.FROM_EMAIL?.trim();
  const adminEmail =
    import.meta.env.QUOTE_TO_EMAIL?.trim() ||
    "quotes@layerforgecanada.com";
  const siteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (!apiKey || !fromEmail || !siteUrl) {
    throw new Error(
      "Quote response email settings are incomplete.",
    );
  }

  const quoteNumber = escapeHtml(quote.quote_number || "Quote");
  const customerName = escapeHtml(
    quote.customer_name || quote.name || "Customer",
  );
  const customerEmail = escapeHtml(quote.email || "Not provided");
  const projectName = escapeHtml(
    quote.project_name || quote.service || "Custom Quote",
  );
  const adminQuoteUrl = `${siteUrl}/admin/quotes/${encodeURIComponent(
    String(quote.id),
  )}`;
  const decision = status === "Approved" ? "approved" : "rejected";
  const decisionColor = status === "Approved" ? "#15803d" : "#b91c1c";
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    replyTo: String(quote.email || "").trim() || undefined,
    subject: `${quoteNumber} ${decision} by ${customerName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a;">
        <h1 style="color:${decisionColor};">Quote ${escapeHtml(status)}</h1>
        <p><strong>${customerName}</strong> has ${decision} quote <strong>${quoteNumber}</strong>.</p>
        <table style="border-collapse:collapse;margin:24px 0;">
          <tr><td style="padding:7px 24px 7px 0;font-weight:bold;">Customer</td><td>${customerName}</td></tr>
          <tr><td style="padding:7px 24px 7px 0;font-weight:bold;">Email</td><td>${customerEmail}</td></tr>
          <tr><td style="padding:7px 24px 7px 0;font-weight:bold;">Project</td><td>${projectName}</td></tr>
        </table>
        <p><a href="${adminQuoteUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Open Quote in Admin</a></p>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      `Resend rejected the quote response notification: ${error.message}`,
    );
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      {
        success: false,
        error: "Invalid request origin.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const quoteId = String(body?.quoteId ?? "").trim();
    const approvalToken = String(body?.approvalToken ?? "").trim();
    const status = String(body?.status ?? "").trim();

    if (!quoteId || !approvalToken || !CUSTOMER_DECISIONS.has(status)) {
      return Response.json(
        {
          success: false,
          error: "A valid quote response is required.",
        },
        { status: 400 },
      );
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select(
        "id, status, order_id, quote_number, customer_name, name, email, project_name, service",
      )
      .eq("id", quoteId)
      .eq("approval_token", approvalToken)
      .maybeSingle();

    if (quoteError) {
      throw new Error(quoteError.message);
    }

    if (!quote) {
      return Response.json(
        {
          success: false,
          error: "Quote not found.",
        },
        { status: 404 },
      );
    }

    if (quote.order_id || quote.status === "Converted") {
      return Response.json(
        {
          success: false,
          error: "This quote has already been converted to an order.",
        },
        { status: 409 },
      );
    }

    if (quote.status === status) {
      return Response.json({ success: true });
    }

    if (!DECIDABLE_STATUSES.includes(String(quote.status))) {
      return Response.json(
        {
          success: false,
          error: "This quote response has already been recorded.",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      approved_at: status === "Approved" ? now : null,
      rejected_at: status === "Rejected" ? now : null,
    };

    const { data: updatedQuote, error: updateError } = await supabaseAdmin
      .from("quotes")
      .update(updates)
      .eq("id", quoteId)
      .eq("approval_token", approvalToken)
      .in("status", DECIDABLE_STATUSES)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedQuote) {
      return Response.json(
        {
          success: false,
          error:
            "The quote changed before this response was recorded. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    try {
      await sendQuoteResponseNotification(quote, status);
    } catch (notificationError) {
      // The customer's decision is authoritative even if email delivery fails.
      console.error("Unable to send quote response notification.", {
        quoteId,
        status,
        error: notificationError,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Unable to record quote response.", {
      error,
    });

    return Response.json(
      {
        success: false,
        error: "Unable to update quote.",
      },
      { status: 500 },
    );
  }
};
