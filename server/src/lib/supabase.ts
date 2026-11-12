import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertSupabaseEnv, env } from '../config/env.js'

assertSupabaseEnv()

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const

/** Verifies customer access tokens. RLS applies. */
export const supabaseAnon: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  clientOptions,
)

/** Bypasses RLS. Only used inside services after the caller is authorised. */
export const supabaseAdmin: SupabaseClient | null = env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, clientOptions)
  : null

let warned = false

/**
 * The client services should query with. Prefers the service-role client and
 * falls back to the anon client (RLS enforced) when no secret key is set.
 */
export function db(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin
  if (!warned) {
    warned = true
    console.warn(
      '[db] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key, so RLS applies to every query.',
    )
  }
  return supabaseAnon
}

export const storage = () => supabaseAdmin ?? supabaseAnon
