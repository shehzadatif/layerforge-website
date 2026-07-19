import {
  createServerClient,
  parseCookieHeader,
} from "@supabase/ssr";

import type { AstroCookies } from "astro";

interface CreateSupabaseServerClientOptions {
  request: Request;
  cookies: AstroCookies;
}

function getSupabaseUrl(): string {
  const rawValue =
    import.meta.env.PUBLIC_SUPABASE_URL?.trim();

  if (!rawValue) {
    throw new Error(
      "Missing PUBLIC_SUPABASE_URL environment variable.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new Error(
      "PUBLIC_SUPABASE_URL is not a valid absolute URL.",
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "PUBLIC_SUPABASE_URL must use HTTPS.",
    );
  }

  /*
   * The project URL must be the Supabase origin only.
   * Remove any harmless trailing slash, but reject API paths.
   */
  if (
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "PUBLIC_SUPABASE_URL must not include a path, query, or fragment.",
    );
  }

  return parsedUrl.origin;
}

function getSupabaseAnonKey(): string {
  const key =
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!key) {
    throw new Error(
      "Missing PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }

  return key;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

/**
 * Creates a request-scoped Supabase client that reads and writes
 * authentication sessions through Astro cookies.
 *
 * Never reuse this client between requests.
 */
export function createSupabaseServerClient({
  request,
  cookies,
}: CreateSupabaseServerClientOptions) {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(
            request.headers.get("cookie") ?? "",
          );
        },

        setAll(cookiesToSet) {
          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            cookies.set(name, value, options);
          }
        },
      },
    },
  );
}