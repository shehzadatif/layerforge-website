import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  hashTeamChatValue,
  loadTeamChatSettings,
  notifyTeamOfChat,
  teamChatAvailability,
} from "../../../lib/teamChat";

export const prerender = false;

async function findConversation(token: string) {
  if (token.length < 32 || token.length > 100) return null;
  const tokenHash = await hashTeamChatValue(token);
  const { data, error } = await supabaseAdmin
    .from("team_chat_conversations")
    .select("id, visitor_name, status")
    .eq("public_token_hash", tokenHash)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = (await request.json()) as Record<string, unknown>;
    const token = String(input.token ?? "").trim();
    const action = String(input.action ?? "read");
    const conversation = await findConversation(token);

    if (!conversation) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (action === "send") {
      if (conversation.status !== "open") {
        return Response.json({ error: "This conversation is closed." }, { status: 409 });
      }

      const body = String(input.message ?? "").trim();
      if (!body || body.length > 2000) {
        return Response.json({ error: "Enter a shorter message." }, { status: 400 });
      }

      const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from("team_chat_messages").insert({
        conversation_id: conversation.id,
        sender: "visitor",
        body,
      });
      if (error) throw error;

      await supabaseAdmin
        .from("team_chat_conversations")
        .update({ last_visitor_message_at: now, updated_at: now })
        .eq("id", conversation.id);

      const availability = teamChatAvailability(await loadTeamChatSettings());
      if (availability.available) {
        await notifyTeamOfChat({
          conversationId: conversation.id,
          visitorName: conversation.visitor_name,
          message: body,
        });
      }
    }

    const { data: messages, error: messageError } = await supabaseAdmin
      .from("team_chat_messages")
      .select("id, sender, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (messageError) throw messageError;

    return Response.json({
      ok: true,
      status: conversation.status,
      availability: teamChatAvailability(await loadTeamChatSettings()),
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("Unable to process team chat messages.", { error });
    return Response.json({ error: "Unable to load the conversation." }, { status: 500 });
  }
};

