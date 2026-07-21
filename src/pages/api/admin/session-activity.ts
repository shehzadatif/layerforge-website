import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";

export const POST: APIRoute = ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_ORIGIN",
          message:
            "The request origin could not be verified.",
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

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
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
