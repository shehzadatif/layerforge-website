import type { APIRoute } from "astro";
import { isSameOriginRequest } from "../../../../lib/isSameOriginRequest";
    

export const POST: APIRoute = async ({ locals, redirect }) => {
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

  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    console.error("Admin logout failed.", {
      userId: locals.user?.id,
      error,
    });

    return new Response(
      JSON.stringify({
        error: {
          code: "LOGOUT_FAILED",
          message: "Unable to sign out.",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return redirect("/admin/login", 303);
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