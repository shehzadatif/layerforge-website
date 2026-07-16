import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, status } = await request.json();

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

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