import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return Response.json(
        {
          success: false,
          error: "Product ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: product, error: productLoadError } =
      await supabaseAdmin
        .from("products")
        .select("id, name")
        .eq("id", productId)
        .single();

    if (productLoadError || !product) {
      return Response.json(
        {
          success: false,
          error: "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    const { data: images, error: imagesLoadError } =
      await supabaseAdmin
        .from("product_images")
        .select("image_url")
        .eq("product_id", productId);

    if (imagesLoadError) {
      throw new Error(imagesLoadError.message);
    }

    const storagePaths = (images ?? [])
      .map((image) => image.image_url)
      .filter(
        (path): path is string =>
          typeof path === "string" &&
          path.length > 0
      );

    if (storagePaths.length > 0) {
      const { error: storageError } =
        await supabaseAdmin.storage
          .from("product-images")
          .remove(storagePaths);

      if (storageError) {
        console.error(
          "Unable to remove product image files:",
          storageError
        );
      }
    }

    const { error: materialsError } =
      await supabaseAdmin
        .from("product_materials")
        .delete()
        .eq("product_id", productId);

    if (materialsError) {
      throw new Error(materialsError.message);
    }

    const { error: variantsError } =
      await supabaseAdmin
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

    if (variantsError) {
      throw new Error(variantsError.message);
    }

    const { error: imagesError } =
      await supabaseAdmin
        .from("product_images")
        .delete()
        .eq("product_id", productId);

    if (imagesError) {
      throw new Error(imagesError.message);
    }

    const { error: productError } =
      await supabaseAdmin
        .from("products")
        .delete()
        .eq("id", productId);

    if (productError) {
      if (productError.code === "23503") {
        return Response.json(
          {
            success: false,
            error:
              "This product is referenced by an existing order or other record. Set the product to Inactive instead.",
          },
          {
            status: 409,
          }
        );
      }

      throw new Error(productError.message);
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Unable to delete product:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete product.",
      },
      {
        status: 500,
      }
    );
  }
};
