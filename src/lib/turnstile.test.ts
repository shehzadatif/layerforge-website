import { describe, expect, it, vi } from "vitest";

import {
  resolveTurnstileSecretKey,
  resolveTurnstileSiteKey,
  TURNSTILE_QUOTE_ACTION,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  verifyTurnstileToken,
} from "./turnstile";

describe("Turnstile configuration", () => {
  it("uses configured keys before development test keys", () => {
    expect(resolveTurnstileSiteKey(" site-key ", "development")).toBe(
      "site-key",
    );
    expect(resolveTurnstileSecretKey(" secret-key ", "development")).toBe(
      "secret-key",
    );
  });

  it("uses official test keys only in development", () => {
    expect(resolveTurnstileSiteKey(undefined, "development")).toBe(
      TURNSTILE_TEST_SITE_KEY,
    );
    expect(resolveTurnstileSecretKey(undefined, "development")).toBe(
      TURNSTILE_TEST_SECRET_KEY,
    );
    expect(resolveTurnstileSiteKey(undefined, "production")).toBe("");
    expect(resolveTurnstileSecretKey(undefined, "production")).toBe("");
  });
});

describe("verifyTurnstileToken", () => {
  it("accepts a successful matching verification", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        action: TURNSTILE_QUOTE_ACTION,
        hostname: "layerforgecanada.com",
      }),
    ) as unknown as typeof fetch;

    await expect(
      verifyTurnstileToken({
        token: "valid-token",
        secret: "production-secret",
        expectedAction: TURNSTILE_QUOTE_ACTION,
        expectedHostname: "layerforgecanada.com",
        fetcher,
      }),
    ).resolves.toEqual({ success: true, errorCodes: [] });
  });

  it("rejects action and hostname mismatches", async () => {
    const actionFetcher = vi.fn(async () =>
      Response.json({
        success: true,
        action: "contact",
        hostname: "layerforgecanada.com",
      }),
    ) as unknown as typeof fetch;
    const hostnameFetcher = vi.fn(async () =>
      Response.json({
        success: true,
        action: TURNSTILE_QUOTE_ACTION,
        hostname: "example.com",
      }),
    ) as unknown as typeof fetch;

    await expect(
      verifyTurnstileToken({
        token: "valid-token",
        secret: "production-secret",
        expectedAction: TURNSTILE_QUOTE_ACTION,
        expectedHostname: "layerforgecanada.com",
        fetcher: actionFetcher,
      }),
    ).resolves.toEqual({ success: false, errorCodes: ["action-mismatch"] });

    await expect(
      verifyTurnstileToken({
        token: "valid-token",
        secret: "production-secret",
        expectedAction: TURNSTILE_QUOTE_ACTION,
        expectedHostname: "layerforgecanada.com",
        fetcher: hostnameFetcher,
      }),
    ).resolves.toEqual({ success: false, errorCodes: ["hostname-mismatch"] });
  });

  it("returns Cloudflare error codes without exposing credentials", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    ) as unknown as typeof fetch;

    await expect(
      verifyTurnstileToken({
        token: "expired-token",
        secret: "production-secret",
        fetcher,
      }),
    ).resolves.toEqual({
      success: false,
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("allows the official development test secret on any hostname", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        action: TURNSTILE_QUOTE_ACTION,
        hostname: "dummy-key.local",
      }),
    ) as unknown as typeof fetch;

    await expect(
      verifyTurnstileToken({
        token: "dummy-token",
        secret: TURNSTILE_TEST_SECRET_KEY,
        expectedAction: TURNSTILE_QUOTE_ACTION,
        expectedHostname: "localhost",
        fetcher,
      }),
    ).resolves.toEqual({ success: true, errorCodes: [] });
  });
});
