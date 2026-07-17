import { supabaseAdmin } from "./supabaseAdmin";

export async function getQuotes() {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getQuote(id: string) {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select(`
      *,
      quote_items(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function createQuote(quote: {
  customer_name: string;
  email: string;
  phone: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .insert(quote)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function createQuoteItems(
  quoteId: string,
  items: {
    product_name: string;
    material: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[]
) {
  const rows = items.map((item) => ({
    quote_id: quoteId,
    ...item,
  }));

  const { error } = await supabaseAdmin
    .from("quote_items")
    .insert(rows);

  if (error) throw error;
}