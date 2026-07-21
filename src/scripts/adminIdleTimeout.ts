import {
  ADMIN_ACTIVITY_HEARTBEAT_MS,
  ADMIN_IDLE_TIMEOUT_MS,
} from "../lib/adminIdleSession";

const ACTIVITY_STORAGE_KEY =
  "layer-forge-admin-last-activity";
const ACTIVITY_WRITE_INTERVAL_MS = 10_000;
const IDLE_CHECK_INTERVAL_MS = 30_000;

let signingOut = false;
let heartbeatInFlight = false;
let lastHeartbeatAt = Date.now();
let lastStorageWriteAt = 0;
let lastActivityAt =
  readStoredActivity() ?? Date.now();

function readStoredActivity(): number | null {
  try {
    const value = Number(
      window.localStorage.getItem(
        ACTIVITY_STORAGE_KEY,
      ),
    );

    return Number.isFinite(value) && value > 0
      ? value
      : null;
  } catch {
    return null;
  }
}

function writeStoredActivity(timestamp: number): void {
  try {
    window.localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      String(timestamp),
    );
  } catch {
    // Server-side enforcement remains authoritative.
  }
}

function clearStoredActivity(): void {
  try {
    window.localStorage.removeItem(
      ACTIVITY_STORAGE_KEY,
    );
  } catch {
    // Ignore storage restrictions during sign-out.
  }
}

async function signOutForInactivity(): Promise<void> {
  if (signingOut) return;

  signingOut = true;

  try {
    await fetch("/api/auth/admin/logout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // The next protected request is still blocked server-side.
  }

  clearStoredActivity();

  window.location.replace(
    "/admin/login?error=session_expired",
  );
}

async function sendActivityHeartbeat(): Promise<void> {
  if (heartbeatInFlight || signingOut) return;

  heartbeatInFlight = true;
  lastHeartbeatAt = Date.now();

  try {
    const response = await fetch(
      "/api/admin/session-activity",
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      await signOutForInactivity();
    }
  } catch {
    // A temporary network failure must not interrupt admin work.
  } finally {
    heartbeatInFlight = false;
  }
}

function recordActivity(): void {
  if (signingOut) return;

  const now = Date.now();
  lastActivityAt = now;

  if (
    now - lastStorageWriteAt >=
    ACTIVITY_WRITE_INTERVAL_MS
  ) {
    writeStoredActivity(now);
    lastStorageWriteAt = now;
  }

  if (
    now - lastHeartbeatAt >=
    ADMIN_ACTIVITY_HEARTBEAT_MS
  ) {
    void sendActivityHeartbeat();
  }
}

function checkIdleState(): void {
  const storedActivity = readStoredActivity();

  if (
    storedActivity &&
    storedActivity > lastActivityAt
  ) {
    lastActivityAt = storedActivity;
  }

  if (
    Date.now() - lastActivityAt >=
    ADMIN_IDLE_TIMEOUT_MS
  ) {
    void signOutForInactivity();
  }
}

function startAdminIdleTimer(): void {
  const initialStoredActivity =
    readStoredActivity();

  if (
    initialStoredActivity &&
    Date.now() - initialStoredActivity >=
      ADMIN_IDLE_TIMEOUT_MS
  ) {
    void signOutForInactivity();
    return;
  }

  writeStoredActivity(lastActivityAt);
  lastStorageWriteAt = Date.now();

  for (const eventName of [
    "pointerdown",
    "keydown",
    "touchstart",
    "scroll",
  ]) {
    window.addEventListener(
      eventName,
      recordActivity,
      { passive: true },
    );
  }

  window.addEventListener(
    "storage",
    (event) => {
      if (event.key !== ACTIVITY_STORAGE_KEY) {
        return;
      }

      if (event.newValue === null) {
        window.location.replace("/admin/login");
        return;
      }

      const timestamp = Number(event.newValue);

      if (
        Number.isFinite(timestamp) &&
        timestamp > lastActivityAt
      ) {
        lastActivityAt = timestamp;
      }
    },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) return;

      checkIdleState();

      if (!signingOut) {
        recordActivity();
      }
    },
  );

  window.setInterval(
    checkIdleState,
    IDLE_CHECK_INTERVAL_MS,
  );
}

startAdminIdleTimer();
