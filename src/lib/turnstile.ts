export const TURNSTILE_QUOTE_ACTION = "quote_request";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY =
  "1x0000000000000000000000000000000AA";

interface TurnstileSiteverifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

interface VerifyTurnstileOptions {
  token: string;
  secret: string;
  remoteIp?: string;
  expectedAction?: string;
  expectedHostname?: string;
  fetcher?: typeof fetch;
}

export interface TurnstileVerification {
  success: boolean;
  errorCodes: string[];
}

export function resolveTurnstileSiteKey(
  configuredValue: string | undefined,
  nodeEnvironment: string | undefined,
): string {
  const configured = configuredValue?.trim();

  if (configured) {
    return configured;
  }

  return nodeEnvironment === "development" ? TURNSTILE_TEST_SITE_KEY : "";
}

export function resolveTurnstileSecretKey(
  configuredValue: string | undefined,
  nodeEnvironment: string | undefined,
): string {
  const configured = configuredValue?.trim();

  if (configured) {
    return configured;
  }

  return nodeEnvironment === "development" ? TURNSTILE_TEST_SECRET_KEY : "";
}

function isTestSecret(secret: string): boolean {
  return secret === TURNSTILE_TEST_SECRET_KEY;
}

export async function verifyTurnstileToken({
  token,
  secret,
  remoteIp,
  expectedAction,
  expectedHostname,
  fetcher = fetch,
}: VerifyTurnstileOptions): Promise<TurnstileVerification> {
  const normalizedToken = token.trim();
  const normalizedSecret = secret.trim();

  if (!normalizedToken || normalizedToken.length > 2048 || !normalizedSecret) {
    return {
      success: false,
      errorCodes: ["missing-input"],
    };
  }

  const body: Record<string, string> = {
    secret: normalizedSecret,
    response: normalizedToken,
    idempotency_key: crypto.randomUUID(),
  };

  if (remoteIp?.trim()) {
    body.remoteip = remoteIp.trim();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return {
        success: false,
        errorCodes: ["siteverify-http-error"],
      };
    }

    const result = (await response.json()) as TurnstileSiteverifyResponse;

    if (result.success !== true) {
      return {
        success: false,
        errorCodes: result["error-codes"] ?? ["verification-failed"],
      };
    }

    if (expectedAction && result.action !== expectedAction) {
      return {
        success: false,
        errorCodes: ["action-mismatch"],
      };
    }

    if (
      expectedHostname &&
      !isTestSecret(normalizedSecret) &&
      result.hostname !== expectedHostname
    ) {
      return {
        success: false,
        errorCodes: ["hostname-mismatch"],
      };
    }

    return {
      success: true,
      errorCodes: [],
    };
  } catch (error) {
    return {
      success: false,
      errorCodes: [error instanceof Error && error.name === "AbortError"
        ? "siteverify-timeout"
        : "siteverify-unavailable"],
    };
  } finally {
    clearTimeout(timeout);
  }
}
