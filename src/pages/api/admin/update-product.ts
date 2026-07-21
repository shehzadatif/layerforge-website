import type { APIRoute } from "astro";
import {
  parseProductVariants,
  productVariantRow,
  ProductVariantValidationError,
  type ProductVariantInput,
} from "../../../lib/productVariants";
import {
  getVariantImageFiles,
  ProductVariantImageError,
  removeProductVariantImages,
  uploadProductVariantImage,
} from "../../../lib/productVariantImages";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

async function syncProductVariants(
  productId: string,
  variants: ProductVariantInput[],
  variantImages: Array<File | null>,
) {
  const { data: existingVariants, error: loadError } = await supabaseAdmin
    .from("product_variants")
    .select("id, image_url")
    .eq("product_id", productId);

  if (loadError) {
    throw new Error(loadError.message);
  }

  const existingById = new Map(
    (existingVariants ?? []).map((variant) => [
      String(variant.id),
      variant.image_url as string | null,
    ]),
  );
  const existingIds = new Set(existingById.keys());
  const submittedIds = new Set(
    variants.flatMap((variant) => (variant.id ? [variant.id] : [])),
  );

  for (const id of submittedIds) {
    if (!existingIds.has(id)) {
      throw new ProductVariantValidationError(
        "A submitted variant does not belong to this product.",
      );
    }
  }

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const image = variantImages[index];
    let uploadedImagePath: string | null = null;

    try {
      if (image) {
        uploadedImagePath = await uploadProductVariantImage(productId, image);
      }

      if (variant.id) {
        const { error } = await supabaseAdmin
          .from("product_variants")
          .update(
            productVariantRow(
              productId,
              variant,
              uploadedImagePath ?? undefined,
            ),
          )
          .eq("product_id", productId)
          .eq("id", variant.id);

        if (error) {
          throw new Error(error.message);
        }

        if (uploadedImagePath) {
          await removeProductVariantImages([existingById.get(variant.id)]);
        }
      } else {
        const { error } = await supabaseAdmin
          .from("product_variants")
          .insert(productVariantRow(productId, variant, uploadedImagePath));

        if (error) {
          throw new Error(error.message);
        }
      }
    } catch (error) {
      if (uploadedImagePath) {
        await removeProductVariantImages([uploadedImagePath]);
      }

      throw error;
    }
  }

  const removedIds = [...existingIds].filter((id) => !submittedIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .eq("product_id", productId)
      .in("id", removedIds);

    if (error) {
      throw new Error(error.message);
    }

    await removeProductVariantImages(
      removedIds.map((id) => existingById.get(id)),
    );
  }
}

export const POST: APIRoute = async ({ request }) => {
  let id = "";

  try {
    const formData = await request.formData();

    id = String(formData.get("id") ?? "").trim();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const categoryId = String(formData.get("category_id") ?? "").trim();

    const shortDescription = String(
      formData.get("short_description") ?? "",
    ).trim();

    const description = String(formData.get("description") ?? "").trim();

    const sku = String(formData.get("sku") ?? "").trim();

    const priceValue = formData.get("price");
    const price =
      priceValue && String(priceValue).trim() !== ""
        ? Number(priceValue)
        : null;

    const salePriceValue = formData.get("sale_price");
    const salePrice =
      salePriceValue && String(salePriceValue).trim() !== ""
        ? Number(salePriceValue)
        : null;

    const featured = formData.get("featured") === "on";

    const status = formData.get("active") === "on" ? "Active" : "Inactive";

    const selectedMaterials = formData.getAll("materials").map(String);

    const variants = parseProductVariants(formData);
    const variantImages = getVariantImageFiles(formData, variants.length);

    if (!id || !name || !categoryId) {
      return new Response("Product ID, name, and category are required.", {
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

    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0)) {
      return new Response("Enter a valid sale price greater than zero.", {
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
        brand: brand || null,
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

    await syncProductVariants(id, variants, variantImages);

    const { error: deleteError } = await supabaseAdmin
      .from("product_materials")
      .delete()
      .eq("product_id", id);

    if (deleteError) {
      console.error("Unable to remove existing product materials.", {
        productId: id,
        error: deleteError,
      });

      return new Response(deleteError.message, {
        status: 500,
      });
    }

    if (selectedMaterials.length > 0) {
      const rows = selectedMaterials.map((materialId) => ({
        product_id: id,
        material_id: materialId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("product_materials")
        .insert(rows);

      if (insertError) {
        console.error("Unable to save product materials.", {
          productId: id,
          error: insertError,
        });

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
    if (
      error instanceof ProductVariantValidationError ||
      error instanceof ProductVariantImageError
    ) {
      return new Response(error.message, {
        status: 400,
      });
    }

    console.error("Product update failed.", {
      productId: id || undefined,
      error,
    });

    return new Response("Server Error", {
      status: 500,
    });
  }
};
