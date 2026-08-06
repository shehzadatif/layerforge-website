import type { APIRoute } from "astro";

import {
  buildGoogleMerchantFeed,
  toMerchantListing,
} from "../lib/googleMerchant";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const configuredSiteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const siteUrl = configuredSiteUrl || url.origin;
  const productImageBaseUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      sku,
      brand,
      short_description,
      description,
      price,
      sale_price,
      status,
      product_images(image_url, sort_order),
      product_materials(materials(markup_percent))
    `,
    )
    .eq("status", "Active")
    .order("name");

  if (error) {
    console.error("Google Merchant feed query failed.", error);
    return new Response("Unable to generate the product feed.", {
      status: 503,
    });
  }

  const listings = (products ?? [])
    .map((product) => toMerchantListing(product, siteUrl, productImageBaseUrl))
    .filter((listing) => listing !== null);

  return new Response(buildGoogleMerchantFeed(listings), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
