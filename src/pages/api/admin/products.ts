import type { APIRoute } from "astro";
import {
  parseProductVariants,
  productVariantRow,
  ProductVariantValidationError,
} from "../../../lib/productVariants";
import {
  getVariantImageFiles,
  ProductVariantImageError,
  removeProductVariantImages,
  uploadProductVariantImage,
} from "../../../lib/productVariantImages";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

class ProductImageValidationError extends Error {}

function getProductImages(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .map((image, index) => {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        throw new ProductImageValidationError(
          `Product image ${index + 1} must be a JPG, PNG, WebP, or GIF file.`,
        );
      }

      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        throw new ProductImageValidationError(
          `Product image ${index + 1} must be 10 MB or smaller.`,
        );
      }

      return image;
    });
}

function getFileExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension) return extension;

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
  try {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const category_id = String(formData.get("category_id") ?? "");
    const short_description = String(formData.get("short_description") ?? "");
    const description = String(formData.get("description") ?? "");

    const price = formData.get("price") ? Number(formData.get("price")) : null;

    const sale_price = formData.get("sale_price")
      ? Number(formData.get("sale_price"))
      : null;

    const featured = formData.get("featured") === "on";

    const status = formData.get("active") === "on" ? "Active" : "Inactive";

    const selectedMaterials = formData.getAll("materials").map(String);

    const variants = parseProductVariants(formData);
    const variantImages = getVariantImageFiles(formData, variants.length);
    const productImages = getProductImages(formData);

    if (!name || !category_id) {
      return new Response("Product name and category are required.", {
        status: 400,
      });
    }

    if (brand.length > 80) {
      return new Response("Brand must be 80 characters or fewer.", {
        status: 400,
      });
    }

    if (price === null || !Number.isFinite(price) || price <= 0) {
      return new Response("Enter a valid base price greater than zero.", {
        status: 400,
      });
    }

    if (
      sale_price !== null &&
      (!Number.isFinite(sale_price) || sale_price <= 0)
    ) {
      return new Response("Enter a valid sale price greater than zero.", {
        status: 400,
      });
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
        brand: brand || null,
        category_id,
        short_description,
        description,
        price,
        sale_price,
        featured,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Unable to create product.", {
        error,
      });

      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const uploadedVariantImages: string[] = [];

    if (variants.length > 0) {
      try {
        const variantRows = [];

        for (let index = 0; index < variants.length; index += 1) {
          const image = variantImages[index];
          const imageUrl = image
            ? await uploadProductVariantImage(product.id, image)
            : null;

          if (imageUrl) uploadedVariantImages.push(imageUrl);

          variantRows.push(
            productVariantRow(product.id, variants[index], imageUrl),
          );
        }

        const { error: variantError } = await supabaseAdmin
          .from("product_variants")
          .insert(variantRows);

        if (variantError) {
          throw new Error(variantError.message);
        }
      } catch (variantError) {
        await removeProductVariantImages(uploadedVariantImages);
        await supabaseAdmin.from("products").delete().eq("id", product.id);

        console.error("Unable to save product variants.", {
          productId: product.id,
          error: variantError,
        });

        return new Response(
          variantError instanceof Error
            ? variantError.message
            : "Unable to save product variants.",
          {
            status: 500,
          },
        );
      }
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
        console.error("Unable to save product materials.", {
          productId: product.id,
          error: materialError,
        });
      }
    }

    const uploadedProductImages: string[] = [];

    try {
      for (let index = 0; index < productImages.length; index += 1) {
        const image = productImages[index];
        const extension = getFileExtension(image);
        const storagePath = `${product.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("product-images")
          .upload(storagePath, await image.arrayBuffer(), {
            contentType: image.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { error: imageRecordError } = await supabaseAdmin
          .from("product_images")
          .insert({
            product_id: product.id,
            image_url: storagePath,
            sort_order: index + 1,
          });

        if (imageRecordError) {
          await supabaseAdmin.storage
            .from("product-images")
            .remove([storagePath]);

          throw new Error(imageRecordError.message);
        }

        uploadedProductImages.push(storagePath);
      }
    } catch (imageError) {
      await removeProductVariantImages([
        ...uploadedVariantImages,
        ...uploadedProductImages,
      ]);
      await supabaseAdmin.from("products").delete().eq("id", product.id);

      console.error("Unable to save product images.", {
        productId: product.id,
        error: imageError,
      });

      return new Response("Unable to save product images.", {
        status: 500,
      });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/products",
      },
    });
  } catch (error) {
    if (
      error instanceof ProductVariantValidationError ||
      error instanceof ProductVariantImageError ||
      error instanceof ProductImageValidationError
    ) {
      return new Response(error.message, {
        status: 400,
      });
    }

    console.error("Product creation failed.", {
      error,
    });

    return Response.json(
      {
        success: false,
        error: "Server Error",
      },
      {
        status: 500,
      },
    );
  }
};
