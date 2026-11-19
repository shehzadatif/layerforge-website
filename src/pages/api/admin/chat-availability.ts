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
    const startHour = String(formData.get("start_hour") ?? "09:00");
    const endHour = String(formData.get("end_hour") ?? "18:00");
    const weekdays = formData
      .getAll("weekdays")
      .map(Number)
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    if (!/^\d{2}:\d{2}$/.test(startHour) || !/^\d{2}:\d{2}$/.test(endHour)) {
      throw new Error("Invalid support hours.");
    }

    const updatedAt = new Date().toISOString();
    const rows = [
      {
        setting_key: "team_chat_manual_available",
        setting_value: formData.get("manual_available") === "on" ? "true" : "false",
        updated_at: updatedAt,
      },
      {
        setting_key: "team_chat_schedule_enabled",
        setting_value: formData.get("schedule_enabled") === "on" ? "true" : "false",
        updated_at: updatedAt,
      },
      { setting_key: "team_chat_start_hour", setting_value: startHour, updated_at: updatedAt },
      { setting_key: "team_chat_end_hour", setting_value: endHour, updated_at: updatedAt },
      {
        setting_key: "team_chat_weekdays",
        setting_value: (weekdays.length ? weekdays : [1, 2, 3, 4, 5]).join(","),
        updated_at: updatedAt,
      },
      {
        setting_key: "team_chat_timezone",
        setting_value: "America/Vancouver",
        updated_at: updatedAt,
      },
    ];

    const { error } = await supabaseAdmin.from("settings").upsert(rows, {
      onConflict: "setting_key",
    });
    if (error) throw error;

    return redirect("/admin/chats?saved=1", 303);
  } catch (error) {
    console.error("Unable to update team chat availability.", { error });
    return new Response("Unable to update availability.", { status: 500 });
  }
};

