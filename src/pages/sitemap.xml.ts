import type { APIRoute } from "astro";

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

export const GET: APIRoute = ({ url }) => {
  const configuredSiteUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const siteUrl = configuredSiteUrl || url.origin;

  const entries = routes
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
