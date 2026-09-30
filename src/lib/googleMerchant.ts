export type MerchantImage = {
  image_url?: string | null;
  sort_order?: number | string | null;
};

export type MerchantMaterialRelation = {
  materials?: {
    markup_percent?: number | string | null;
  } | null;
};

export type MerchantProduct = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  brand?: string | null;
  short_description?: string | null;
  description?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  status?: string | null;
  product_images?: MerchantImage[] | null;
  product_materials?: MerchantMaterialRelation[] | null;
};

export type MerchantListing = {
  id: string;
  mpn: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  price: number;
  brand: string;
};

const DEFAULT_BRAND = "Layer Forge Canada";
const EXCLUDED_MERCHANT_SLUGS = new Set([
  "handgun-inspired-business-card-holder-office-display-stand",
]);

export function isGoogleMerchantEligible(product: MerchantProduct): boolean {
  return !EXCLUDED_MERCHANT_SLUGS.has(String(product.slug ?? "").trim());
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMerchantPrice(product: MerchantProduct): number | null {
  const regularPrice = Number(product.price);
  const salePrice = Number(product.sale_price);
  const basePrice =
    Number.isFinite(salePrice) && salePrice > 0 ? salePrice : regularPrice;

  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

  const markups = (product.product_materials ?? [])
    .map((relation) => Number(relation.materials?.markup_percent ?? 0))
    .filter((markup) => Number.isFinite(markup) && markup > -100);
  const lowestMarkup = markups.length > 0 ? Math.min(...markups) : 0;

  return Math.round(basePrice * (1 + lowestMarkup / 100) * 100) / 100;
}

export function resolveProductImageUrl(
  product: MerchantProduct,
  productImageBaseUrl: string,
): string {
  const image = [...(product.product_images ?? [])]
    .sort(
      (left, right) =>
        Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0),
    )
    .find((candidate) => Boolean(candidate.image_url));
  const imagePath = String(image?.image_url ?? "").trim();

  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  return `${productImageBaseUrl.replace(/\/+$/, "")}/${imagePath.replace(/^\/+/, "")}`;
}

export function toMerchantListing(
  product: MerchantProduct,
  siteUrl: string,
  productImageBaseUrl: string,
): MerchantListing | null {
  const title = plainText(product.name);
  const slug = String(product.slug ?? "").trim();
  const id = String(product.sku || product.id || "").trim();
  const price = getMerchantPrice(product);
  const imageLink = resolveProductImageUrl(product, productImageBaseUrl);
  const description = plainText(
    product.short_description || product.description || product.name,
  );

  if (!title || !slug || !id || !description || !imageLink || price === null) {
    return null;
  }

  return {
    id,
    mpn: id,
    title,
    description: description.slice(0, 5_000),
    link: new URL(`/shop/${encodeURIComponent(slug)}`, siteUrl).toString(),
    imageLink,
    price,
    brand: DEFAULT_BRAND,
  };
}

export function buildGoogleMerchantFeed(listings: MerchantListing[]): string {
  const items = listings
    .map(
      (listing) => `    <item>
      <g:id>${escapeXml(listing.id)}</g:id>
      <g:title>${escapeXml(listing.title)}</g:title>
      <g:description>${escapeXml(listing.description)}</g:description>
      <g:link>${escapeXml(listing.link)}</g:link>
      <g:image_link>${escapeXml(listing.imageLink)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:price>${listing.price.toFixed(2)} CAD</g:price>
      <g:brand>${escapeXml(listing.brand)}</g:brand>
      <g:mpn>${escapeXml(listing.mpn)}</g:mpn>
      <g:identifier_exists>yes</g:identifier_exists>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Layer Forge Canada</title>
    <link>https://layerforgecanada.com/</link>
    <description>Products made and customized by Layer Forge Canada.</description>
${items}
  </channel>
</rss>`;
}

export function buildProductStructuredData(listing: MerchantListing) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: [listing.imageLink],
    sku: listing.id,
    mpn: listing.mpn,
    brand: {
      "@type": "Brand",
      name: listing.brand,
    },
    offers: {
      "@type": "Offer",
      url: listing.link,
      priceCurrency: "CAD",
      price: listing.price.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
