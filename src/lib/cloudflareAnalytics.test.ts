import { describe, expect, it, vi } from "vitest";

import { cloudflareAnalyticsTestUtils } from "./cloudflareAnalytics";

const DAY_SECONDS = 24 * 60 * 60;

const {
  createQueryPlan,
  getSafeCloudflareErrorMessage,
  logCloudflareIssue,
} = cloudflareAnalyticsTestUtils;

describe("Cloudflare analytics query limits", () => {
  it("keeps a 30-day report inside a 31-day dataset window", () => {
    const now = new Date("2026-07-24T20:00:00.000Z");
    const plan = createQueryPlan(now, {
      maxDuration: 31 * DAY_SECONDS,
      maxPageSize: 1000,
      notOlderThan: 31 * DAY_SECONDS,
    });

    expect(plan.periodDays).toBe(30);
    expect(plan.historyLimited).toBe(false);
    expect(plan.windows).toHaveLength(1);

    const [window] = plan.windows;
    const durationSeconds =
      (Date.parse(window.datetimeLt) - Date.parse(window.datetimeGeq)) / 1000;

    expect(durationSeconds).toBeLessThan(31 * DAY_SECONDS);
  });

  it("splits a retention-limited report into contiguous safe windows", () => {
    const now = new Date("2026-07-24T20:00:00.000Z");
    const plan = createQueryPlan(now, {
      maxDuration: DAY_SECONDS,
      maxPageSize: 1000,
      notOlderThan: 7 * DAY_SECONDS,
    });

    expect(plan.periodDays).toBe(7);
    expect(plan.historyLimited).toBe(true);
    expect(plan.windows.length).toBeGreaterThan(1);

    for (const [index, window] of plan.windows.entries()) {
      const durationSeconds =
        (Date.parse(window.datetimeLt) - Date.parse(window.datetimeGeq)) / 1000;
      expect(durationSeconds).toBeLessThan(DAY_SECONDS);

      if (index > 0) {
        expect(window.datetimeGeq).toBe(plan.windows[index - 1].datetimeLt);
      }
    }

    expect(plan.windows.at(-1)?.datetimeLt).toBe(now.toISOString());
  });
});

describe("Cloudflare analytics error logging", () => {
  it("redacts configured and bearer tokens from API messages", () => {
    const token = "cloudflare-secret-token";
    const message = getSafeCloudflareErrorMessage(
      new Error(
        `cannot request that duration with ${token}; Authorization Bearer abc.def-123`,
      ),
      [token],
    );

    expect(message).toContain("cannot request that duration");
    expect(message).not.toContain(token);
    expect(message).not.toContain("abc.def-123");
    expect(message).toContain("[redacted]");
  });

  it("writes the safe API detail as a serialized log string", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logCloudflareIssue(
      "error",
      "Unable to load Cloudflare website analytics",
      new Error("cannot request a duration of 2678401s"),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "Unable to load Cloudflare website analytics: cannot request a duration of 2678401s",
    );
    expect(errorSpy.mock.calls[0]).toHaveLength(1);
  });
});
