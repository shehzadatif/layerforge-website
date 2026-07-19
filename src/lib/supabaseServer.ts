import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

interface CreateSupabaseServerClientOptions {
  request: Request;
  cookies: AstroCookies;
}

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing PUBLIC_SUPABASE_URL environment variable.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing PUBLIC_SUPABASE_ANON_KEY environment variable.");
}

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
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") ?? "");
      },

      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}