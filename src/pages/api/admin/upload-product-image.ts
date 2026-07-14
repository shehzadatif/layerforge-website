import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const productId = String(formData.get("product_id") ?? "");

    const images = formData.getAll("images") as File[];

    if (!productId || images.length === 0) {
      return new Response("Missing product or images.", {
        status: 400,
      });
    }

    // Get current highest sort order
    const { data: lastImage } = await supabaseAdmin
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1);

    let sortOrder = lastImage?.[0]?.sort_order ?? 0;

    for (const image of images) {

      if (image.size === 0) continue;

      const extension = image.name.split(".").pop();

      const filename =
        `${productId}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${extension}`;

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("product-images")
          .upload(filename, image);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      sortOrder++;

      await supabaseAdmin
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: filename,
          sort_order: sortOrder,
        });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/products/${productId}`,
      },
    });

  } catch (err) {

    console.error(err);

    return new Response("Upload failed.", {
      status: 500,
    });

  }
};