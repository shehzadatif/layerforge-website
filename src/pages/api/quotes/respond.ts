import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const POST: APIRoute = async ({ request }) => {

  try {

    const { quoteId, status } = await request.json();

    const updates: Record<string, unknown> = {
      status,
    };

    if (status === "Approved") {
      updates.approved_at = new Date().toISOString();
    }

    if (status === "Rejected") {
      updates.rejected_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("quotes")
      .update(updates)
      .eq("id", quoteId);

    if (error) throw error;

    return Response.json({
      success: true,
    });

  } catch (err) {

    console.error(err);

    return Response.json(
      { success: false },
      { status: 500 }
    );

  }

};