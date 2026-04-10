import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Server-only Supabase client using service role key.
 * Bypasses RLS — use ONLY in API routes for jira_sessions access.
 * NEVER import this from client components.
 */
export function createServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
