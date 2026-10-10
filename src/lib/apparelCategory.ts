import { supabaseAdmin } from "./supabaseAdmin";

export async function getCustomApparelCategoryId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", "custom-apparel")
    .maybeSingle();

  if (error || !data?.id) {
    console.error("Unable to resolve the Custom Apparel category.", { error });
    throw new Error("The Custom Apparel category is not configured.");
  }

  return String(data.id);
}
