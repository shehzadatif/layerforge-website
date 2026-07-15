import { supabase } from "../lib/supabase";

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories(*),
      product_images(*),
      product_variants(*)
    `)
    .eq("status", "Active")
    .order("name");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}