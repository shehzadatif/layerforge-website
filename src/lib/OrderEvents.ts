import { supabaseAdmin } from "./supabaseAdmin";

export async function addOrderEvent(
  orderId: string,
  title: string,
  description = "",
  eventType = "status"
) {
  const { error } = await supabaseAdmin
    .from("order_events")
    .insert({
      order_id: orderId,
      title,
      description,
      event_type: eventType,
    });

  if (error) throw error;
}

export async function getOrderEvents(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data;
}