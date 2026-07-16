import { supabaseAdmin } from "./supabaseAdmin";

export async function getOrderByTrackingToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items(*),
      order_events(*)
    `)
    .eq("tracking_token", token)
    .single();

  if (error) throw error;

  return data;
}