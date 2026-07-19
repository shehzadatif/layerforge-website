import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let id = "";

  try {
    const formData = await request.formData();

    id = String(formData.get("id") ?? "").trim();

    const name = String(formData.get("name") ?? "").trim();
    const categoryId = String(
      formData.get("category_id") ?? "",
    ).trim();

    const shortDescription = String(
      formData.get("short_description") ?? "",
    ).trim();

    const description = String(
      formData.get("description") ?? "",
    ).trim();

    const sku = String(formData.get("sku") ?? "").trim();

    const priceValue = formData.get("price");
    const price =
      priceValue && String(priceValue).trim() !== ""
        ? Number(priceValue)
        : null;

    const salePriceValue = formData.get("sale_price");
    const salePrice =
      salePriceValue &&
      String(salePriceValue).trim() !== ""
        ? Number(salePriceValue)
        : null;

    const featured = formData.get("featured") === "on";

    const status =
      formData.get("active") === "on"
        ? "Active"
        : "Inactive";

    const selectedMaterials = formData
      .getAll("materials")
      .map(String);

    if (!id || !name || !categoryId) {
      return new Response(
        "Product ID, name, and category are required.",
        {
          status: 400,
        },
      );
    }

    if (
      price !== null &&
      (!Number.isFinite(price) || price < 0)
    ) {
      return new Response("Invalid base price.", {
        status: 400,
      });
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0)
    ) {
      return new Response("Invalid sale price.", {
        status: 400,
      });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        name,
        slug,
        category_id: categoryId,
        short_description: shortDescription,
        description,
        price,
        sale_price: salePrice,
        sku: sku || null,
        featured,
        status,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Unable to update product.", {
        productId: id,
        error: updateError,
      });

      return new Response(updateError.message, {
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