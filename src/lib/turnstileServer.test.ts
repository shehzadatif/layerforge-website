import { afterEach, describe, expect, it, vi } from "vitest";

import { getTurnstileServerEnvironment } from "./turnstileServer";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Turnstile server environment", () => {
  it("reads keys from the Worker runtime environment", () => {
    vi.stubEnv("PUBLIC_TURNSTILE_SITE_KEY", "runtime-site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "runtime-secret-key");

    expect(getTurnstileServerEnvironment()).toMatchObject({
      publicSiteKey: "runtime-site-key",
      secretKey: "runtime-secret-key",
    });
  });
});
