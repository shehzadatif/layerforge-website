import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim();
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-CA")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!name || !slug) {
    return redirect("/admin/categories?error=missing-name", 303);
  }

  const duplicateQuery = supabaseAdmin
    .from("categories")
    .select("id")
    .ilike("name", name);

  const { data: duplicateCategories, error: duplicateError } = parentId
    ? await duplicateQuery.eq("parent_id", parentId)
    : await duplicateQuery.is("parent_id", null);

  if (duplicateError) {
    console.error("Unable to check for an existing category.", duplicateError);
    return redirect("/admin/categories?error=save-failed", 303);
  }

  if ((duplicateCategories ?? []).length > 0) {
    return redirect("/admin/categories?error=duplicate", 303);
  }

  const { error } = await supabaseAdmin.from("categories").insert({
    name,
    slug,
    parent_id: parentId || null,
  });

  if (error) {
    console.error("Unable to create category.", error);
    return redirect("/admin/categories?error=save-failed", 303);
  }

  return redirect("/admin/categories?created=1", 303);
};
