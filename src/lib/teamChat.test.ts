import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseAdmin", () => ({
  supabaseAdmin: {},
}));

let createTeamChatToken: typeof import("./teamChat").createTeamChatToken;
let hashTeamChatValue: typeof import("./teamChat").hashTeamChatValue;
let teamChatAvailability: typeof import("./teamChat").teamChatAvailability;

const settings = {
  manualAvailable: true,
  scheduleEnabled: true,
  startHour: "09:00",
  endHour: "18:00",
  weekdays: [1, 2, 3, 4, 5],
  timezone: "America/Vancouver",
};

beforeAll(async () => {
  ({ createTeamChatToken, hashTeamChatValue, teamChatAvailability } =
    await import("./teamChat"));
});

describe("teamChatAvailability", () => {
  it("is available during configured Vancouver business hours", () => {
    const result = teamChatAvailability(
      settings,
      new Date("2026-11-18T18:00:00Z"),
    );

    expect(result.available).toBe(true);
  });

  it("is unavailable outside the configured schedule", () => {
    const result = teamChatAvailability(
      settings,
      new Date("2026-11-19T03:00:00Z"),
    );

    expect(result.available).toBe(false);
    expect(result.message).toContain("Leave a message");
  });

  it("honours the manual unavailable switch", () => {
    const result = teamChatAvailability(
      { ...settings, manualAvailable: false, scheduleEnabled: false },
      new Date("2026-11-18T18:00:00Z"),
    );

    expect(result.available).toBe(false);
  });
});

describe("team chat tokens", () => {
  it("creates unique opaque tokens", () => {
    const first = createTeamChatToken();
    const second = createTeamChatToken();

    expect(first).toHaveLength(43);
    expect(second).not.toBe(first);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes tokens consistently without retaining the original value", async () => {
    const token = "visitor-token";
    const first = await hashTeamChatValue(token);
    const second = await hashTeamChatValue(token);

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(first).not.toContain(token);
  });
});
