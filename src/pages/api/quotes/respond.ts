import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const CUSTOMER_DECISIONS = new Set(["Approved", "Rejected"]);
const DECIDABLE_STATUSES = ["Sent", "Draft", "New"];

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
      .select("id, status, order_id")
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
