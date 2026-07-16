import crypto from "node:crypto";

export function generateTrackingToken(length = 32) {
  return crypto
    .randomBytes(length)
    .toString("base64url")
    .replace(/-/g, "")
    .replace(/_/g, "")
    .slice(0, length);
}