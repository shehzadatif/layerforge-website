import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const formData = await request.formData();
    const conversationId = String(formData.get("conversation_id") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !message || message.length > 2000) {
      return new Response("Invalid reply.", { status: 400 });
    }

    const { error: messageError } = await supabaseAdmin
      .from("team_chat_messages")
      .insert({ conversation_id: conversationId, sender: "team", body: message });
    if (messageError) throw messageError;

    const now = new Date().toISOString();
    const { error: conversationError } = await supabaseAdmin
      .from("team_chat_conversations")
      .update({
        last_team_message_at: now,
        admin_seen_at: now,
        updated_at: now,
      })
      .eq("id", conversationId);
    if (conversationError) throw conversationError;

    return redirect(`/admin/chats/${conversationId}?sent=1`, 303);
  } catch (error) {
    console.error("Unable to send team chat reply.", { error });
    return new Response("Unable to send reply.", { status: 500 });
  }
};

