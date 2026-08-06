import type { APIRoute } from "astro";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const prerender = false;

const routes = [
  "",
  "/about",
  "/services",
  "/3d-printing",
  "/laser-engraving",
  "/uv-printing",
  "/shop",
  "/gallery",
  "/solutions",
  "/what-we-make",
  "/quote",
  "/quote/3d-printing",
  "/quote/laser-engraving",
  "/quote/uv-printing",
  "/contact",
  "/terms",
];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ url }) => {
  const configuredSiteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const siteUrl = configuredSiteUrl || url.origin;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("slug")
    .eq("status", "Active")
    .order("slug");

  if (error) {
    console.error("Product sitemap query failed.", error);
  }

  const productRoutes = (products ?? [])
    .map((product) => String(product.slug ?? "").trim())
    .filter(Boolean)
    .map((slug) => `/shop/${encodeURIComponent(slug)}`);

  const entries = [...routes, ...productRoutes]
    .map((route) => {
      const location = new URL(route || "/", siteUrl).toString();
      return `  <url><loc>${escapeXml(location)}</loc></url>`;
    })
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};
