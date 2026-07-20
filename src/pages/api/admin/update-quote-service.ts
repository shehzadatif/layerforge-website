import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const allowedServices = new Set([
  "3D Printing",
  "Laser Engraving",
  "UV Printing",
  "DTF & DTG",
  "Other / Custom",
]);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const quoteId = String(body.quoteId ?? "").trim();
    const service = String(body.service ?? "").trim();

    if (!quoteId || !allowedServices.has(service)) {
      return Response.json(
        {
          success: false,
          error: "Please select a valid service.",
        },
        { status: 400 },
      );
    }

    const { data: quote, error } = await supabaseAdmin
      .from("quotes")
      .update({ service })
      .eq("id", quoteId)
      .select("id, service, order_id")
      .maybeSingle();

    if (error) {
      console.error("Unable to update quote service:", error);
      return Response.json(
        {
          success: false,
          error: "Unable to update service classification.",
        },
        { status: 500 },
      );
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

    return Response.json({
      success: true,
      service: quote.service,
      linkedOrder: Boolean(quote.order_id),
    });
  } catch (error) {
    console.error("Quote service update failed:", error);
    return Response.json(
      {
        success: false,
        error: "Unable to update service classification.",
      },
      { status: 500 },
    );
  }
};
