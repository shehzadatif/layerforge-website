import {
  isThreeDPrintMaterial,
  isThreeDPrintQuality,
  type CloudSlicerQuoteOptions,
} from "./cloudSlicer";

export const THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS = 10 * 60;

interface ThreeDSlicerJobTokenBase extends CloudSlicerQuoteOptions {
  version: 1;
  fileId: string;
  expiresAt: number;
}

export interface ThreeDSlicerUploadJobToken extends ThreeDSlicerJobTokenBase {
  stage: "upload";
}

export interface ThreeDSlicerPollJobToken extends ThreeDSlicerJobTokenBase {
  stage: "poll";
  quoteId: string;
}

export type ThreeDSlicerJobTokenPayload =
  ThreeDSlicerUploadJobToken | ThreeDSlicerPollJobToken;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function isSafeProviderId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function isValidPayload(
  value: unknown,
  expectedStage: ThreeDSlicerJobTokenPayload["stage"],
  nowSeconds: number,
): value is ThreeDSlicerJobTokenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const infillPercent = Number(payload.infillPercent);
  const quantity = Number(payload.quantity);
  const expiresAt = Number(payload.expiresAt);

  return (
    payload.version === 1 &&
    payload.stage === expectedStage &&
    isSafeProviderId(payload.fileId) &&
    (expectedStage !== "poll" || isSafeProviderId(payload.quoteId)) &&
    isThreeDPrintMaterial(payload.material) &&
    isThreeDPrintQuality(payload.quality) &&
    Number.isInteger(infillPercent) &&
    infillPercent >= 5 &&
    infillPercent <= 100 &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 10_000 &&
    Number.isInteger(expiresAt) &&
    expiresAt > nowSeconds &&
    expiresAt <= nowSeconds + THREE_D_SLICER_JOB_TOKEN_TTL_SECONDS
  );
}

export async function signThreeDSlicerJobToken(
  payload: ThreeDSlicerJobTokenPayload,
  secret: string,
): Promise<string> {
  if (secret.trim().length < 32) {
    throw new Error("The slicer job signing secret is too short.");
  }

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedPayload = encodeBase64Url(payloadBytes);
  const signingKey = await importSigningKey(secret.trim());
  const signature = await crypto.subtle.sign(
    "HMAC",
    signingKey,
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyThreeDSlicerJobToken<
  TStage extends ThreeDSlicerJobTokenPayload["stage"],
>(
  token: string,
  secret: string,
  expectedStage: TStage,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<Extract<ThreeDSlicerJobTokenPayload, { stage: TStage }> | null> {
  const normalizedToken = token.trim();

  if (normalizedToken.length > 4096) {
    return null;
  }

  const [encodedPayload, encodedSignature, extra] = normalizedToken.split(".");

  if (
    !encodedPayload ||
    !encodedSignature ||
    extra !== undefined ||
    secret.trim().length < 32
  ) {
    return null;
  }

  const payloadBytes = decodeBase64Url(encodedPayload);
  const signatureBytes = decodeBase64Url(encodedSignature);

  if (!payloadBytes || !signatureBytes) {
    return null;
  }

  try {
    const signingKey = await importSigningKey(secret.trim());
    const signature = new Uint8Array(signatureBytes.byteLength);
    signature.set(signatureBytes);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      signingKey,
      signature,
      new TextEncoder().encode(encodedPayload),
    );

    if (!signatureValid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as unknown;

    if (!isValidPayload(payload, expectedStage, nowSeconds)) {
      return null;
    }

    return payload as Extract<ThreeDSlicerJobTokenPayload, { stage: TStage }>;
  } catch {
    return null;
  }
}
