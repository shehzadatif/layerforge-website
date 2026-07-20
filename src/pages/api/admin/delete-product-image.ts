import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let imageId = "";
  let productId = "";

  try {
    const formData = await request.formData();

    imageId = String(
      formData.get("image_id") ?? "",
    ).trim();

    productId = String(
      formData.get("product_id") ?? "",
    ).trim();

    if (!imageId || !productId) {
      return new Response(
        "Image ID and product ID are required.",
        {
          status: 400,
        },
      );
    }

    const { data: image, error: imageError } =
      await supabaseAdmin
        .from("product_images")
        .select("id, product_id, image_url")
        .eq("id", imageId)
        .eq("product_id", productId)
        .single();

    if (imageError || !image) {
      console.warn("Product image not found.", {
        imageId,
        productId,
        error: imageError,
      });

      return new Response("Image not found.", {
        status: 404,
      });
    }

    const { error: storageError } =
      await supabaseAdmin.storage
        .from("product-images")
        .remove([image.image_url]);

    if (storageError) {
      console.error(
        "Unable to delete product image from storage.",
        {
          imageId,
          productId,
          storagePath: image.image_url,
          error: storageError,
        },
      );

      return new Response(
        "Unable to delete the image from storage.",
        {
          status: 500,
        },
      );
    }

    const { error: databaseError } =
      await supabaseAdmin
        .from("product_images")
        .delete()
        .eq("id", imageId)
        .eq("product_id", productId);

    if (databaseError) {
      console.error(
        "Unable to delete product image record.",
        {
          imageId,
          productId,
          error: databaseError,
        },
      );

      return new Response(
        "The image file was deleted, but the database record could not be removed.",
        {
          status: 500,
        },
      );
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/products/${productId}`,
      },
    });
  } catch (error) {
    console.error("Product image deletion failed.", {
      imageId: imageId || undefined,
      productId: productId || undefined,
      error,
    });

    return new Response("Delete failed.", {
      status: 500,
    });
  }
};