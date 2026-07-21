export const ADMIN_IDLE_TIMEOUT_MS =
  2 * 60 * 60 * 1000;

export const ADMIN_ACTIVITY_HEARTBEAT_MS =
  5 * 60 * 1000;

export const ADMIN_ACTIVITY_REFRESH_MS =
  60 * 1000;

export const ADMIN_ACTIVITY_SESSION_KEY =
  "layerForgeAdminActivity" as const;

export interface AdminActivityRecord {
  userId: string;
  lastActivityAt: number;
}

export type AdminActivityStatus =
  | "missing"
  | "active"
  | "expired";

export function getAdminActivityStatus(
  value: unknown,
  userId: string,
  now: number,
): AdminActivityStatus {
  if (value === undefined) {
    return "missing";
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("userId" in value) ||
    !("lastActivityAt" in value)
  ) {
    return "expired";
  }

  const record = value as Partial<AdminActivityRecord>;

  if (
    record.userId !== userId ||
    typeof record.lastActivityAt !== "number" ||
    !Number.isFinite(record.lastActivityAt) ||
    record.lastActivityAt <= 0 ||
    record.lastActivityAt > now + ADMIN_ACTIVITY_REFRESH_MS
  ) {
    return "expired";
  }

  return now - record.lastActivityAt >=
    ADMIN_IDLE_TIMEOUT_MS
    ? "expired"
    : "active";
}

export function shouldRefreshAdminActivity(
  lastActivityAt: number,
  now: number,
): boolean {
  return (
    now - lastActivityAt >=
    ADMIN_ACTIVITY_REFRESH_MS
  );
}
