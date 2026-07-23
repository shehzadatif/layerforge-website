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

    if (variants.length > 0) {
      const uploadedVariantImages: string[] = [];

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

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/products",
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
