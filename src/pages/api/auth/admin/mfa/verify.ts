import type { APIContext, APIRoute } from "astro";
import { isSameOriginRequest } from "../../../../../lib/isSameOriginRequest";

const MFA_PATH = "/admin/mfa";
const ADMIN_PATH = "/admin";

function redirectWithError(
  redirect: APIContext["redirect"],
  error: string,
) {
  const searchParams = new URLSearchParams({ error });

  return redirect(`${MFA_PATH}?${searchParams.toString()}`, 303);
}

export const POST: APIRoute = async ({
  request,
  locals,
  redirect,
}) => {
  if (!isSameOriginRequest(request)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_ORIGIN",
          message: "The request origin could not be verified.",
        },
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!locals.user) {
    return redirect("/admin/login", 303);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectWithError(redirect, "missing_code");
  }

  const factorIdValue = formData.get("factorId");
  const codeValue = formData.get("code");

  const factorId =
    typeof factorIdValue === "string"
      ? factorIdValue.trim()
      : "";

  const code =
    typeof codeValue === "string"
      ? codeValue.replace(/\s/g, "")
      : "";

  if (!factorId || !/^\d{6}$/.test(code)) {
    return redirectWithError(redirect, "missing_code");
  }

  const { data: factorsData, error: factorsError } =
    await locals.supabase.auth.mfa.listFactors();

  if (factorsError) {
    console.error("Unable to list MFA factors before verification.", {
      userId: locals.user.id,
      error: factorsError,
    });

    return redirectWithError(
      redirect,
      "verification_failed",
    );
  }

  const factorIsVerifiedTotp =
    factorsData.totp.some(
      (factor) =>
        factor.id === factorId &&
        factor.status === "verified",
    );

  if (!factorIsVerifiedTotp) {
    console.warn("Admin submitted an unavailable MFA factor.", {
      userId: locals.user.id,
      factorId,
    });

    return redirectWithError(
      redirect,
      "factor_unavailable",
    );
  }

  const { error: verificationError } =
    await locals.supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

  if (verificationError) {
    console.warn("Admin MFA verification failed.", {
      userId: locals.user.id,
      factorId,
      status: verificationError.status,
      code: verificationError.code,
    });

    const errorCode =
      verificationError.code === "mfa_verification_failed"
        ? "invalid_code"
        : "verification_failed";

    return redirectWithError(redirect, errorCode);
  }

  const { data: assurance, error: assuranceError } =
    await locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    assuranceError ||
    assurance.currentLevel !== "aal2"
  ) {
    console.error(
      "Admin MFA verification did not produce an aal2 session.",
      {
        userId: locals.user.id,
        assurance,
        assuranceError,
      },
    );

    return redirectWithError(
      redirect,
      "verification_failed",
    );
  }

  return redirect(ADMIN_PATH, 303);
};

export const ALL: APIRoute = () =>
  new Response(
    JSON.stringify({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed.",
      },
    }),
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );