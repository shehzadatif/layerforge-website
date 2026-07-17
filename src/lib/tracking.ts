import crypto from "node:crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTrackingToken(): string {
  const part = (length: number) => {
    let result = "";

    for (let i = 0; i < length; i++) {
      result += CHARS[crypto.randomInt(0, CHARS.length)];
    }

    return result;
  };

  return `LFTRK-${part(4)}-${part(4)}-${part(4)}`;
}

export function generateApprovalToken() {
  return crypto.randomUUID().replace(/-/g, "").toUpperCase();
}