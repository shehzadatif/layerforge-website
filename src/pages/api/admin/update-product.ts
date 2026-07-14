import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const id = String(formData.get("id") ?? "");

    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");

    const priceValue = formData.get("price");
    const price =
      priceValue && String(priceValue).trim() !== ""
        ? Number(priceValue)
        : null;

    const selectedMaterials = formData
      .getAll("materials")
      .map(String);

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    console.log("========== UPDATE PRODUCT ==========");
    console.log({
      id,
      name,
      description,
      price,
      slug,
      selectedMaterials,
    });

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({
        name,
        slug,
        description,
        price,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error(error);

      return new Response(error.message, {
        status: 500,
      });
    }

    // Remove existing material assignments
    const { error: deleteError } = await supabaseAdmin
      .from("product_materials")
      .delete()
      .eq("product_id", id);

    if (deleteError) {
      console.error(deleteError);
    }

    // Insert newly selected materials
    if (selectedMaterials.length > 0) {

      const rows = selectedMaterials.map(materialId => ({
        product_id: id,
        material_id: materialId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("product_materials")
        .insert(rows);

      if (insertError) {
        console.error(insertError);
      }
    }

    return new Response(null, {
      status: 302,
      headers: {
       Location: `/admin/products/${id}?saved=1`,
      },
    });

  } catch (err) {
    console.error(err);

    return new Response("Server Error", {
      status: 500,
    });
  }
};
