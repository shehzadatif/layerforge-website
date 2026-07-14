import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "");
    const category_id = String(formData.get("category_id") ?? "");
    const short_description = String(formData.get("short_description") ?? "");
    const description = String(formData.get("description") ?? "");

    const price = formData.get("price")
      ? Number(formData.get("price"))
      : null;

    const sale_price = formData.get("sale_price")
      ? Number(formData.get("sale_price"))
      : null;

    const sku = String(formData.get("sku") ?? "");

    const stock = formData.get("stock")
      ? Number(formData.get("stock"))
      : 0;

    const featured = formData.get("featured") === "on";

    const status =
      formData.get("active") === "on"
        ? "Active"
        : "Inactive";

        const selectedMaterials = formData
  .getAll("materials")
  .map(String);

  console.log("Selected Materials:", selectedMaterials);

for (const [key, value] of formData.entries()) {
  console.log(key, value);
}

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

   const { data: product, error } = await supabaseAdmin
  .from("products")
  .insert({
    name,
    slug,
    category_id,
    short_description,
    description,
    price,
    sale_price,
    sku,
    stock,
    featured,
    status,
  })
  .select()
  .single();

    if (error) {
      console.error(error);

      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

if (selectedMaterials.length > 0) {

  const rows = selectedMaterials.map((materialId) => ({
    product_id: product.id,
    material_id: materialId,
  }));

  const { error: materialError } = await supabaseAdmin
    .from("product_materials")
    .insert(rows);

  if (materialError) {
    console.error(materialError);
  }

}

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/products",
      },
    });

  } catch (err) {
    console.error(err);

    return Response.json(
      {
        success: false,
        error: "Server Error",
      },
      {
        status: 500,
      }
    );
  }
};