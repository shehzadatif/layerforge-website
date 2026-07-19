import type { APIContext, APIRoute } from "astro";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";

const LOGIN_PATH = "/admin/login";
const DEFAULT_RETURN_TO = "/admin";

function getSafeReturnTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return DEFAULT_RETURN_TO;
  }

  const returnTo = value.trim();

  if (
    returnTo === "/admin" ||
    returnTo.startsWith("/admin/") ||
    returnTo.startsWith("/admin?")
  ) {
    return returnTo;
  }

  return DEFAULT_RETURN_TO;
}

function loginErrorRedirect(
  redirect: APIContext["redirect"],
  error: string,
  returnTo: string,
) {
  const searchParams = new URLSearchParams({
    error,
    returnTo,
  });

  return redirect(`${LOGIN_PATH}?${searchParams.toString()}`, 303);
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
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return loginErrorRedirect(
      redirect,
      "missing_credentials",
      DEFAULT_RETURN_TO,
    );
  }

  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const returnTo = getSafeReturnTo(formData.get("returnTo"));

  const email =
    typeof emailValue === "string"
      ? emailValue.trim().toLowerCase()
      : "";

  const password =
    typeof passwordValue === "string"
      ? passwordValue
      : "";

  if (!email || !password) {
    return loginErrorRedirect(
      redirect,
      "missing_credentials",
      returnTo,
    );
  }

  if (!locals.supabase) {
    console.error(
      "Supabase server client is missing from Astro locals.",
    );

    return loginErrorRedirect(
      redirect,
      "auth_unavailable",
      returnTo,
    );
  }

  const { error } =
    await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    console.warn("Admin login failed.", {
  email,
  name: error.name,
  message: error.message,
  status: error.status,
  code: error.code,
});

    const errorCode =
      error.status === 400 ||
      error.status === 401 ||
      error.code === "invalid_credentials"
        ? "invalid_credentials"
        : "auth_unavailable";

    return loginErrorRedirect(
      redirect,
      errorCode,
      returnTo,
    );
  }

  return redirect(returnTo, 303);
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