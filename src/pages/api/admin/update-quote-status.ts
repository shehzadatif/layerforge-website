import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { quoteId, status } = await request.json();

    const { error } = await supabaseAdmin
      .from("quotes")
      .update({
        status,
      })
      .eq("id", quoteId);

    if (error) throw error;

    return Response.json({
      success: true,
    });

  } catch (err) {

    console.error(err);

    return Response.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );

  }
};