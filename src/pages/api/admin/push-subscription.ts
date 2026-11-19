import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = (await request.json()) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    const endpoint = String(input.endpoint ?? "").trim();
    const p256dh = String(input.keys?.p256dh ?? "").trim();
    const auth = String(input.keys?.auth ?? "").trim();

    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return Response.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("admin_push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? "",
        updated_at: now,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to save admin push subscription.", { error });
    return Response.json({ error: "Unable to enable notifications." }, { status: 500 });
  }
};

