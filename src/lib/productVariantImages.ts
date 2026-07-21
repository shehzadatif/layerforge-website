import { supabaseAdmin } from "./supabaseAdmin";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export class ProductVariantImageError extends Error {}

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

export function getVariantImageFiles(
  formData: FormData,
  variantCount: number,
): Array<File | null> {
  const values = formData.getAll("variant_image");

  if (values.length > variantCount) {
    throw new ProductVariantImageError(
      "The submitted variant images do not match the submitted variants.",
    );
  }

  return Array.from({ length: variantCount }, (_, index) => {
    const value = values[index];

    if (!(value instanceof File) || value.size === 0) {
      return null;
    }

    if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
      throw new ProductVariantImageError(
        `Variant image ${index + 1} must be a JPG, PNG, WebP, or GIF file.`,
      );
    }

    if (value.size > MAX_IMAGE_SIZE_BYTES) {
      throw new ProductVariantImageError(
        `Variant image ${index + 1} must be 10 MB or smaller.`,
      );
    }

    return value;
  });
}

export async function uploadProductVariantImage(
  productId: string,
  image: File,
): Promise<string> {
  const extension = getFileExtension(image);
  const storagePath = `${productId}/variants/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(storagePath, await image.arrayBuffer(), {
      contentType: image.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

export async function removeProductVariantImages(
  imagePaths: Array<string | null | undefined>,
): Promise<void> {
  const paths = [
    ...new Set(
      imagePaths.filter(
        (path): path is string =>
          typeof path === "string" &&
          path.length > 0 &&
          !path.startsWith("http://") &&
          !path.startsWith("https://"),
      ),
    ),
  ];

  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .remove(paths);

  if (error) {
    console.error("Unable to remove variant image files.", {
      paths,
      error,
    });
  }
}
