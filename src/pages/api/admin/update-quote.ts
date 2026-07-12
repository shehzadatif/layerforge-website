import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      id,
      status,
      quoted_price,
      internal_notes,
    } = await request.json();

    const { error } = await supabaseAdmin
      .from("quotes")
      .update({
        status,
        quoted_price,
        internal_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: "Server Error",
      },
      { status: 500 }
    );
  }
};