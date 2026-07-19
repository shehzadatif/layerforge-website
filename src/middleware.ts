import { defineMiddleware } from "astro:middleware";

import { applySecurityHeaders } from "./lib/securityHeaders";
import { createSupabaseServerClient } from "./lib/supabaseServer";

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_MFA_SETUP_PATH = "/admin/mfa-setup";
const ADMIN_MFA_PATH = "/admin/mfa";
const ADMIN_HOME_PATH = "/admin";

function isAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApi(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function protectAdminResponse(response: Response): Response {
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
          ...(redirectTo ? { redirectTo } : {}),
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

function textError(status: number, message: string): Response {
  return protectAdminResponse(
    new Response(message, {
      status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }),
  );
}

export const onRequest = defineMiddleware(
  async ({ request, cookies, locals, url, redirect }, next) => {
    const supabase = createSupabaseServerClient({
      request,
      cookies,
    });

    /*
     * Populate locals for every request, including authentication endpoints
     * under /api/auth/admin/*.
     */
    locals.supabase = supabase;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    locals.user = userError ? null : user;

    const pathname = url.pathname;
    const adminPage = isAdminPage(pathname);
    const adminApi = isAdminApi(pathname);

    /*
     * Public pages and authentication endpoints still receive the general
     * security headers, but are not forced into private/no-cache behavior.
     */
    if (!adminPage && !adminApi) {
      return applySecurityHeaders(await next());
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
        return protectAdminResponse(await next());
      }

      const returnTo = `${pathname}${url.search}`;

      return redirect(
        `${ADMIN_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`,
        303,
      );
    }

    /*
     * Verify that the authenticated account has an administrator profile.
     */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", locals.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Unable to determine admin role.", {
        userId: locals.user.id,
        error: profileError,
      });

      if (adminApi) {
        return jsonError(
          503,
          "ADMIN_ROLE_UNAVAILABLE",
          "Unable to verify administrator access.",
        );
      }

      return textError(503, "Unable to verify administrator access.");
    }

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      console.warn("Unauthorized admin access attempt.", {
        userId: locals.user.id,
        email: locals.user.email,
      });

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
     * Determine MFA enrollment and current assurance level.
     */
    const [
      { data: factorsData, error: factorsError },
      { data: assuranceData, error: assuranceError },
    ] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsError || assuranceError) {
      console.error("Unable to determine admin MFA status.", {
        userId: locals.user.id,
        factorsError,
        assuranceError,
      });

      if (adminApi) {
        return jsonError(
          503,
          "AUTH_STATUS_UNAVAILABLE",
          "Unable to verify the current authentication status.",
        );
      }

      return textError(503, "Unable to verify authentication status.");
    }

    const hasVerifiedTotpFactor =
      factorsData.totp?.some(
        (factor) => factor.status === "verified",
      ) ?? false;

    const hasAal2 = assuranceData.currentLevel === "aal2";

    /*
     * Protected admin API endpoints require both a verified TOTP factor
     * and an active aal2 session.
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

      return protectAdminResponse(await next());
    }

    /*
     * An authenticated administrator should not remain on the login page.
     */
    if (pathname === ADMIN_LOGIN_PATH) {
      if (!hasVerifiedTotpFactor) {
        return redirect(ADMIN_MFA_SETUP_PATH, 303);
      }

      if (!hasAal2) {
        return redirect(ADMIN_MFA_PATH, 303);
      }

      return redirect(ADMIN_HOME_PATH, 303);
    }

    /*
     * Allow enrollment only while no verified TOTP factor exists.
     */
    if (pathname === ADMIN_MFA_SETUP_PATH) {
      if (!hasVerifiedTotpFactor) {
        return protectAdminResponse(await next());
      }

      return redirect(
        hasAal2 ? ADMIN_HOME_PATH : ADMIN_MFA_PATH,
        303,
      );
    }

    /*
     * Allow the MFA challenge page only when a verified factor exists
     * and the current session has not yet reached aal2.
     */
    if (pathname === ADMIN_MFA_PATH) {
      if (!hasVerifiedTotpFactor) {
        return redirect(ADMIN_MFA_SETUP_PATH, 303);
      }

      if (hasAal2) {
        return redirect(ADMIN_HOME_PATH, 303);
      }

      return protectAdminResponse(await next());
    }

    /*
     * All other admin pages require completed MFA enrollment and aal2.
     */
    if (!hasVerifiedTotpFactor) {
      return redirect(ADMIN_MFA_SETUP_PATH, 303);
    }

    if (!hasAal2) {
      return redirect(ADMIN_MFA_PATH, 303);
    }

    return protectAdminResponse(await next());
  },
);