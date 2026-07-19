import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let id = "";

  try {
    const formData = await request.formData();

    id = String(formData.get("id") ?? "");

    const name = String(formData.get("name") ?? "");
    const description = String(
      formData.get("description") ?? "",
    );

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

    const { error } = await supabaseAdmin
      .from("products")
      .update({
        name,
        slug,
        description,
        price,
      })
      .eq("id", id);

    if (error) {
      console.error("Unable to update product.", {
        productId: id,
        error,
      });

      return new Response(error.message, {
        status: 500,
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("product_materials")
      .delete()
      .eq("product_id", id);

    if (deleteError) {
      console.error(
        "Unable to remove existing product materials.",
        {
          productId: id,
          error: deleteError,
        },
      );

      return new Response(deleteError.message, {
        status: 500,
      });
    }

    if (selectedMaterials.length > 0) {
      const rows = selectedMaterials.map(
        (materialId) => ({
          product_id: id,
          material_id: materialId,
        }),
      );

      const { error: insertError } =
        await supabaseAdmin
          .from("product_materials")
          .insert(rows);

      if (insertError) {
        console.error(
          "Unable to save product materials.",
          {
            productId: id,
            error: insertError,
          },
        );

        return new Response(insertError.message, {
          status: 500,
        });
      }
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/products/${id}?saved=1`,
      },
    });
  } catch (error) {
    console.error("Product update failed.", {
      productId: id || undefined,
      error,
    });

    return new Response("Server Error", {
      status: 500,
    });
  }
};