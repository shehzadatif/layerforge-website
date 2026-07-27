import type { APIRoute } from "astro";

import { loadLaserEngravingPublicPricing } from "../../../lib/laserEngravingPricingServer";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return Response.json(await loadLaserEngravingPublicPricing(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load public laser engraving pricing.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Laser engraving estimates are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
};
