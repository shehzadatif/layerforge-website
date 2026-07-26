import type { APIRoute } from "astro";

import { loadThreeDQuotePublicPricing } from "../../../lib/threeDQuotePricingServer";

export const prerender = false;

export const GET: APIRoute = async () => {
  const publicPricing = await loadThreeDQuotePublicPricing();

  return Response.json(publicPricing, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
