import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  createTeamChatToken,
  hashTeamChatValue,
  loadTeamChatSettings,
  notifyTeamOfChat,
  requestFingerprint,
  teamChatAvailability,
} from "../../../lib/teamChat";

export const prerender = false;

function textValue(value: unknown, maximum: number, required = false): string {
  const result = String(value ?? "").trim();
  if (required && !result) throw new Error("A message is required.");
  if (result.length > maximum) throw new Error("Message details are too long.");
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = (await request.json()) as Record<string, unknown>;

    if (textValue(input.website, 200)) {
      return Response.json({ ok: true });
    }

    const visitorName = textValue(input.name, 120);
    const visitorEmail = textValue(input.email, 254).toLowerCase();
    const message = textValue(input.message, 2000, true);
    const sourcePage = textValue(input.sourcePage, 500);

    if (
      visitorEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)
    ) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const fingerprint = await requestFingerprint(request);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await supabaseAdmin
      .from("team_chat_conversations")
      .select("id", { count: "exact", head: true })
      .eq("request_fingerprint", fingerprint)
      .gte("created_at", oneHourAgo);

    if (rateError) throw rateError;
    if ((count ?? 0) >= 3) {
      return Response.json(
        { error: "Please wait before starting another team conversation." },
        { status: 429 },
      );
    }

    const publicToken = createTeamChatToken();
    const tokenHash = await hashTeamChatValue(publicToken);
    const now = new Date().toISOString();
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("team_chat_conversations")
      .insert({
        public_token_hash: tokenHash,
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        source_page: sourcePage,
        request_fingerprint: fingerprint,
        last_visitor_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      throw conversationError ?? new Error("Unable to create conversation.");
    }

    const { data: createdMessage, error: messageError } = await supabaseAdmin
      .from("team_chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender: "visitor",
        body: message,
      })
      .select("id, sender, body, created_at")
      .single();

    if (messageError || !createdMessage) {
      await supabaseAdmin
        .from("team_chat_conversations")
        .delete()
        .eq("id", conversation.id);
      throw messageError ?? new Error("Unable to save message.");
    }

    const availability = teamChatAvailability(await loadTeamChatSettings());

    if (availability.available) {
      await notifyTeamOfChat({
        conversationId: conversation.id,
        visitorName,
        message,
      });
    }

    return Response.json({
      ok: true,
      token: publicToken,
      availability,
      message: createdMessage,
    });
  } catch (error) {
    console.error("Unable to start a team chat.", { error });
    return Response.json(
      { error: "We couldn’t send your message. Please try again shortly." },
      { status: 500 },
    );
  }
};

