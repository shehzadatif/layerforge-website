/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AdminActivityRecord } from "./lib/adminIdleSession";

declare global {
  namespace App {
    interface SessionData {
      layerForgeAdminActivity: AdminActivityRecord;
    }

    interface Locals {
      supabase: SupabaseClient;
      user: User | null;
    }
  }
}

export {};
