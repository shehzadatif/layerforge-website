import { supabaseAdmin } from "./supabaseAdmin";
import { generateTrackingToken } from "./tracking";
import { ORDER_STATUS } from "./orderStatus";

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
  materialSummary?: string;
  deliveryMethod: "shipping" | "pickup";
}

export interface OrderItem {
  id: string;
  name: string;
  materialId?: string;
  materialName: string;
  quantity: number;
  price: number;
  image?: string;
  productionDays?: number;
}

/**
 * Create a new order
 */
export async function createOrder(
  customer: CustomerInfo,
  subtotal: number
) {
  const trackingToken = generateTrackingToken();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      tracking_token: trackingToken,

      customer_name: `${customer.firstName} ${customer.lastName}`,

      email: customer.email,
      phone: customer.phone,

      shipping_address: customer.address,
      city: customer.city,
      province: customer.province,
      postal_code: customer.postalCode,
      country: "Canada",

      unit: customer.unit ?? "",

      delivery_method: customer.deliveryMethod,

      material_summary: customer.materialSummary ?? "",

      subtotal,
      shipping: 0,
      tax: 0,
      total: subtotal,

      payment_status: "Pending",
      order_status: ORDER_STATUS.NEW,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Save order items
 */
export async function createOrderItems(
  orderId: string,
  items: OrderItem[]
) {
  const rows = items.map((item) => ({
    order_id: orderId,
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
    material: item.materialName,
    production_days: item.productionDays ?? 0,
  }));

  const { error } = await supabaseAdmin
    .from("order_items")
    .insert(rows);

  if (error) throw error;
}

/**
 * Save Stripe Checkout Session ID
 */
export async function updateStripeSession(
  orderId: string,
  sessionId: string
) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      stripe_session_id: sessionId,
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Mark payment complete
 */
export async function markOrderPaid(
  orderId: string,
  paymentIntent: string
) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      payment_status: "Paid",
      order_status: ORDER_STATUS.IN_PROGRESS,
      stripe_payment_intent: paymentIntent,
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Get all orders
 */
export async function getOrders() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}

/**
 * Get one order
 */
export async function getOrder(id: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}