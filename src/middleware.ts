import { defineMiddleware } from "astro:middleware";

import {
  ADMIN_ACTIVITY_SESSION_KEY,
  getAdminActivityStatus,
  shouldRefreshAdminActivity,
} from "./lib/adminIdleSession";
import { applySecurityHeaders } from "./lib/securityHeaders";
import { createSupabaseServerClient } from "./lib/supabaseServer";

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_MFA_SETUP_PATH = "/admin/mfa-setup";
const ADMIN_MFA_PATH = "/admin/mfa";
const ADMIN_HOME_PATH = "/admin";

const STRIPE_WEBHOOK_PATH = "/api/stripe-webhooks";

function isAdminPage(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function isAdminApi(pathname: string): boolean {
  return (
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

function protectAdminResponse(
  response: Response,
): Response {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );

  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return applySecurityHeaders(response);
}

function jsonError(
  status: number,
  code: string,
  message: string,
  redirectTo?: string,
): Response {
  return protectAdminResponse(
    new Response(
      JSON.stringify({
        error: {
          code,
          message,
          ...(redirectTo
            ? { redirectTo }
            : {}),
        },
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );
}

function textError(
  status: number,
  message: string,
): Response {
  return protectAdminResponse(
    new Response(message, {
      status,
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
      },
    }),
  );
}

export const onRequest = defineMiddleware(
  async (
    {
      request,
      cookies,
      locals,
      session,
      url,
      redirect,
    },
    next,
  ) => {
    const pathname = url.pathname;

    /*
     * Stripe requires the exact unmodified request body for
     * webhook signature verification. Skip all authentication
     * and Supabase middleware work for this endpoint.
     */
    if (pathname === STRIPE_WEBHOOK_PATH) {
      return next();
    }

    /*
     * Create a request-scoped Supabase client and expose it
     * through Astro locals for pages and API endpoints.
     */
    const supabase =
      createSupabaseServerClient({
        request,
        cookies,
      });

    locals.supabase = supabase;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn(
        "Unable to load authenticated user.",
        {
          path: pathname,
          error: userError,
        },
      );
    }

    locals.user = userError ? null : user;

    const adminPage = isAdminPage(pathname);
    const adminApi = isAdminApi(pathname);

    /*
     * Public pages and authentication endpoints receive
     * standard security headers without private caching.
     */
    if (!adminPage && !adminApi) {
      return applySecurityHeaders(
        await next(),
      );
    }

    /*
     * Unauthenticated admin requests.
     */
    if (!locals.user) {
      if (adminApi) {
        return jsonError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required.",
          ADMIN_LOGIN_PATH,
        );
      }

      if (pathname === ADMIN_LOGIN_PATH) {
        return protectAdminResponse(
          await next(),
        );
      }

      const returnTo =
        `${pathname}${url.search}`;

      return redirect(
        `${ADMIN_LOGIN_PATH}?returnTo=${encodeURIComponent(
          returnTo,
        )}`,
        303,
      );
    }

    /*
     * Verify that the authenticated account has an
     * administrator profile.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", locals.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Unable to determine admin role.",
        {
          userId: locals.user.id,
          error: profileError,
        },
      );

      if (adminApi) {
        return jsonError(
          503,
          "ADMIN_ROLE_UNAVAILABLE",
          "Unable to verify administrator access.",
        );
      }

      return textError(
        503,
        "Unable to verify administrator access.",
      );
    }

    const isAdmin =
      profile?.role === "admin";

    if (!isAdmin) {
      console.warn(
        "Unauthorized admin access attempt.",
        {
          userId: locals.user.id,
          email: locals.user.email,
        },
      );

      if (adminApi) {
        return jsonError(
          403,
          "ADMIN_ACCESS_REQUIRED",
          "Administrator access is required.",
        );
      }

      return textError(403, "Forbidden");
    }

    /*
     * Determine MFA enrollment and the current assurance
     * level.
     */
    const [
      {
        data: factorsData,
        error: factorsError,
      },
      {
        data: assuranceData,
        error: assuranceError,
      },
    ] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsError || assuranceError) {
      console.error(
        "Unable to determine admin MFA status.",
        {
          userId: locals.user.id,
          factorsError,
          assuranceError,
        },
      );

      if (adminApi) {
        return jsonError(
          503,
          "AUTH_STATUS_UNAVAILABLE",
          "Unable to verify the current authentication status.",
        );
      }

      return textError(
        503,
        "Unable to verify authentication status.",
      );
    }

    const hasVerifiedTotpFactor =
      factorsData.totp?.some(
        (factor) =>
          factor.status === "verified",
      ) ?? false;

    const hasAal2 =
      assuranceData.currentLevel === "aal2";

    /*
     * Keep a server-side record of authenticated admin activity.
     * A missing record is initialized for existing sessions during
     * rollout. Invalid, mismatched, or stale records fail closed.
     */
    if (hasAal2) {
      const now = Date.now();
      const activity =
        await session.get(
          ADMIN_ACTIVITY_SESSION_KEY,
        );
      const activityStatus =
        getAdminActivityStatus(
          activity,
          locals.user.id,
          now,
        );

      if (activityStatus === "expired") {
        const { error: signOutError } =
          await supabase.auth.signOut({
            scope: "local",
          });

        if (signOutError) {
          console.error(
            "Unable to end an expired admin session.",
            {
              userId: locals.user.id,
              error: signOutError,
            },
          );

          session.set(
            ADMIN_ACTIVITY_SESSION_KEY,
            {
              userId: locals.user.id,
              lastActivityAt: 0,
            },
          );

          if (adminApi) {
            return jsonError(
              503,
              "ADMIN_LOGOUT_UNAVAILABLE",
              "The expired session could not be closed. Please try again.",
            );
          }

          return textError(
            503,
            "The expired session could not be closed. Please try again.",
          );
        }

        session.destroy();

        const expiredLoginPath =
          `${ADMIN_LOGIN_PATH}?error=session_expired`;

        if (adminApi) {
          return jsonError(
            401,
            "ADMIN_SESSION_EXPIRED",
            "The admin session expired due to inactivity.",
            expiredLoginPath,
          );
        }

        return redirect(
          expiredLoginPath,
          303,
        );
      }

      if (
        activityStatus === "missing" ||
        (
          activityStatus === "active" &&
          activity !== undefined &&
          shouldRefreshAdminActivity(
            activity.lastActivityAt,
            now,
          )
        )
      ) {
        session.set(
          ADMIN_ACTIVITY_SESSION_KEY,
          {
            userId: locals.user.id,
            lastActivityAt: now,
          },
        );
      }
    }

    /*
     * Protected admin API endpoints require both an
     * enrolled TOTP factor and an AAL2 session.
     */
    if (adminApi) {
      if (!hasVerifiedTotpFactor) {
        return jsonError(
          403,
          "MFA_ENROLLMENT_REQUIRED",
          "A TOTP authenticator must be enrolled before accessing admin APIs.",
          ADMIN_MFA_SETUP_PATH,
        );
      }

      if (!hasAal2) {
        return jsonError(
          403,
          "MFA_VERIFICATION_REQUIRED",
          "MFA verification is required before accessing admin APIs.",
          ADMIN_MFA_PATH,
        );
      }

      return protectAdminResponse(
        await next(),
      );
    }

    /*
     * An authenticated administrator should not remain on
     * the login page.
     */
    if (pathname === ADMIN_LOGIN_PATH) {
      if (!hasVerifiedTotpFactor) {
        return redirect(
          ADMIN_MFA_SETUP_PATH,
          303,
        );
      }

      if (!hasAal2) {
        return redirect(
          ADMIN_MFA_PATH,
          303,
        );
      }

      return redirect(
        ADMIN_HOME_PATH,
        303,
      );
    }

    /*
     * Allow enrollment only while no verified TOTP factor
     * exists.
     */
    if (
      pathname === ADMIN_MFA_SETUP_PATH
    ) {
      if (!hasVerifiedTotpFactor) {
        return protectAdminResponse(
          await next(),
        );
      }

      return redirect(
        hasAal2
          ? ADMIN_HOME_PATH
          : ADMIN_MFA_PATH,
        303,
      );
    }

    /*
     * Allow the MFA challenge page only when a verified
     * factor exists and the session has not reached AAL2.
     */
    if (pathname === ADMIN_MFA_PATH) {
      if (!hasVerifiedTotpFactor) {
        return redirect(
          ADMIN_MFA_SETUP_PATH,
          303,
        );
      }

      if (hasAal2) {
        return redirect(
          ADMIN_HOME_PATH,
          303,
        );
      }

      return protectAdminResponse(
        await next(),
      );
    }

    /*
     * All remaining admin pages require completed MFA
     * enrollment and an AAL2 session.
     */
    if (!hasVerifiedTotpFactor) {
      return redirect(
        ADMIN_MFA_SETUP_PATH,
        303,
      );
    }

    if (!hasAal2) {
      return redirect(
        ADMIN_MFA_PATH,
        303,
      );
    }

    return protectAdminResponse(
      await next(),
    );
  },
);
