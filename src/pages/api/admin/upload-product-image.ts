import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getFileExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension) {
    return extension;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export const POST: APIRoute = async ({ request }) => {
  let productId = "";

  try {
    const formData = await request.formData();

    productId = String(
      formData.get("product_id") ?? "",
    ).trim();

    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    if (!productId || images.length === 0) {
      return new Response(
        "A product and at least one image are required.",
        {
          status: 400,
        },
      );
    }

    const validImages = images.filter((image) => {
      if (image.size <= 0) {
        return false;
      }

      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        return false;
      }

      return ALLOWED_IMAGE_TYPES.has(image.type);
    });

    if (validImages.length === 0) {
      return new Response(
        "No valid images were provided. Use JPG, PNG, WebP, or GIF files up to 10 MB each.",
        {
          status: 400,
        },
      );
    }

    const { data: lastImages, error: sortError } =
      await supabaseAdmin
        .from("product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", {
          ascending: false,
        })
        .limit(1);

    if (sortError) {
      console.error(
        "Unable to determine product image sort order.",
        {
          productId,
          error: sortError,
        },
      );

      return new Response(
        "Unable to prepare image upload.",
        {
          status: 500,
        },
      );
    }

    let sortOrder =
      Number(lastImages?.[0]?.sort_order ?? 0);

    for (const image of validImages) {
      const extension = getFileExtension(image);

      const storagePath =
        `${productId}/${crypto.randomUUID()}.${extension}`;

      const fileBytes = await image.arrayBuffer();

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("product-images")
          .upload(storagePath, fileBytes, {
            contentType: image.type,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Unable to upload product image.",
          {
            productId,
            filename: image.name,
            error: uploadError,
          },
        );

        continue;
      }

      sortOrder += 1;

      const { error: insertError } =
        await supabaseAdmin
          .from("product_images")
          .insert({
            product_id: productId,
            image_url: storagePath,
            sort_order: sortOrder,
          });

      if (insertError) {
        console.error(
          "Unable to save product image record.",
          {
            productId,
            storagePath,
            error: insertError,
          },
        );

        await supabaseAdmin.storage
          .from("product-images")
          .remove([storagePath]);
      }
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/admin/products/${productId}`,
      },
    });
  } catch (error) {
    console.error("Product image upload failed.", {
      productId: productId || undefined,
      error,
    });

    return new Response("Upload failed.", {
      status: 500,
    });
  }
};