import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

import { supabaseAdmin } from "./supabaseAdmin";

export interface TeamChatAvailability {
  available: boolean;
  message: string;
  timezone: string;
}

export interface TeamChatSettings {
  manualAvailable: boolean;
  scheduleEnabled: boolean;
  startHour: string;
  endHour: string;
  weekdays: number[];
  timezone: string;
}

const DEFAULT_SETTINGS: TeamChatSettings = {
  manualAvailable: true,
  scheduleEnabled: true,
  startHour: "09:00",
  endHour: "18:00",
  weekdays: [1, 2, 3, 4, 5],
  timezone: "America/Vancouver",
};

const weekdayNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function booleanSetting(value: unknown, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function loadTeamChatSettings(): Promise<TeamChatSettings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [
      "team_chat_manual_available",
      "team_chat_schedule_enabled",
      "team_chat_start_hour",
      "team_chat_end_hour",
      "team_chat_weekdays",
      "team_chat_timezone",
    ]);

  if (error) {
    console.warn("Unable to load team chat availability settings.", { error });
    return DEFAULT_SETTINGS;
  }

  const values = new Map(
    (data ?? []).map((row) => [row.setting_key, row.setting_value]),
  );
  const weekdays = String(values.get("team_chat_weekdays") ?? "1,2,3,4,5")
    .split(",")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return {
    manualAvailable: booleanSetting(
      values.get("team_chat_manual_available"),
      DEFAULT_SETTINGS.manualAvailable,
    ),
    scheduleEnabled: booleanSetting(
      values.get("team_chat_schedule_enabled"),
      DEFAULT_SETTINGS.scheduleEnabled,
    ),
    startHour:
      String(values.get("team_chat_start_hour") ?? "").trim() ||
      DEFAULT_SETTINGS.startHour,
    endHour:
      String(values.get("team_chat_end_hour") ?? "").trim() ||
      DEFAULT_SETTINGS.endHour,
    weekdays: weekdays.length ? weekdays : DEFAULT_SETTINGS.weekdays,
    timezone:
      String(values.get("team_chat_timezone") ?? "").trim() ||
      DEFAULT_SETTINGS.timezone,
  };
}

function localScheduleParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: weekdayNumber[value("weekday")] ?? -1,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function teamChatAvailability(
  settings: TeamChatSettings,
  now = new Date(),
): TeamChatAvailability {
  if (!settings.manualAvailable) {
    return {
      available: false,
      message:
        "Our team is currently unavailable. Leave a message and we’ll respond during business hours.",
      timezone: settings.timezone,
    };
  }

  if (settings.scheduleEnabled) {
    const local = localScheduleParts(now, settings.timezone);
    const withinSchedule =
      settings.weekdays.includes(local.weekday) &&
      local.time >= settings.startHour &&
      local.time < settings.endHour;

    if (!withinSchedule) {
      return {
        available: false,
        message:
          "Our team is currently unavailable. Leave a message and we’ll respond during business hours.",
        timezone: settings.timezone,
      };
    }
  }

  return {
    available: true,
    message: "A Layer Forge team member is available to help.",
    timezone: settings.timezone,
  };
}

export function createTeamChatToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function hashTeamChatValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function requestFingerprint(request: Request): Promise<string> {
  const address =
    request.headers.get("CF-Connecting-IP")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt = import.meta.env.TEAM_CHAT_RATE_LIMIT_SECRET?.trim() || "layer-forge";
  return hashTeamChatValue(`${salt}:${address}`);
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function notifyTeamOfChat(input: {
  conversationId: string;
  visitorName: string;
  message: string;
}): Promise<void> {
  const publicKey = import.meta.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = import.meta.env.VAPID_PRIVATE_KEY?.trim();

  if (!publicKey || !privateKey) {
    console.warn("Team chat push keys are not configured.");
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("Unable to load admin push subscriptions.", { error });
    return;
  }

  const vapid: VapidKeys = {
    subject: "mailto:support@layerforgecanada.com",
    publicKey,
    privateKey,
  };
  const body = input.message.replace(/\s+/g, " ").trim().slice(0, 150);

  await Promise.all(
    ((data ?? []) as PushSubscriptionRow[]).map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      try {
        const payload = await buildPushPayload(
          {
            data: JSON.stringify({
              title: "New Layer Forge chat",
              body: `${input.visitorName || "Website visitor"}: ${body}`,
              url: `/admin/chats/${input.conversationId}`,
            }),
            options: { ttl: 300 },
          },
          subscription,
          vapid,
        );
        const response = await fetch(subscription.endpoint, payload);

        if (response.status === 404 || response.status === 410) {
          await supabaseAdmin
            .from("admin_push_subscriptions")
            .delete()
            .eq("id", row.id);
          return;
        }

        if (!response.ok) throw new Error(`Push service returned ${response.status}.`);

        await supabaseAdmin
          .from("admin_push_subscriptions")
          .update({
            last_success_at: new Date().toISOString(),
            failure_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      } catch (error) {
        console.error("Unable to deliver an admin chat notification.", {
          subscriptionId: row.id,
          error,
        });
      }
    }),
  );
}

