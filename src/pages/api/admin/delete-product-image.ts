import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const imageId = String(formData.get("image_id"));
    const productId = String(formData.get("product_id"));

    const { data: image } = await supabaseAdmin
      .from("product_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (!image) {
      return new Response("Image not found.", {
        status: 404,
      });
    }

    // Delete from Storage
    await supabaseAdmin.storage
      .from("product-images")
      .remove([image.image_url]);

    // Delete database row
    await supabaseAdmin
      .from("product_images")
      .delete()
      .eq("id", imageId);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/products/${productId}`,
      },
    });

  } catch (err) {
    console.error(err);

    return new Response("Delete failed.", {
      status: 500,
    });
  }
};