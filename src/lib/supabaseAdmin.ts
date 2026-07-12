import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase admin environment variables: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);