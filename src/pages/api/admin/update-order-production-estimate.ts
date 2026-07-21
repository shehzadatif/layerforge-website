import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const orderId = String(body?.orderId ?? "").trim();
    const productionDays = Number(body?.productionDays);

    if (
      !orderId ||
      !Number.isInteger(productionDays) ||
      productionDays < 1 ||
      productionDays > 365
    ) {
      return Response.json(
        { success: false, error: "Enter production days between 1 and 365." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("order_items")
      .update({ production_days: productionDays })
      .eq("order_id", orderId)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return Response.json(
        { success: false, error: "No order items were found." },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Unable to update production estimate:", error);

    return Response.json(
      { success: false, error: "Unable to update production estimate." },
      { status: 500 },
    );
  }
};
