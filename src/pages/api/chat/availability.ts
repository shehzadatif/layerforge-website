import type { APIRoute } from "astro";

import {
  loadTeamChatSettings,
  teamChatAvailability,
} from "../../../lib/teamChat";

export const prerender = false;

export const GET: APIRoute = async () => {
  const availability = teamChatAvailability(await loadTeamChatSettings());

  return Response.json(availability, {
    headers: { "Cache-Control": "no-store" },
  });
};

