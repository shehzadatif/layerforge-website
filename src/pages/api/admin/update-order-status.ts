import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { addOrderEvent } from "../../../lib/orderEvents";

const statusDescriptions: Record<string, string> = {
  Pending: "Your order has been received.",
  Preparing: "We are preparing your order.",
  "3D Printing": "Your parts are currently being 3D printed.",
  "Laser Engraving": "Laser engraving is in progress.",
  "UV Printing": "UV printing is in progress.",
  Ready: "Your order is ready.",
  Shipped: "Your order has been shipped.",
  Completed: "Your order has been completed.",
  Cancelled: "Your order has been cancelled.",
};

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

    await addOrderEvent(
      orderId,
      status,
      statusDescriptions[status] ?? "",
      "status"
    );

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
