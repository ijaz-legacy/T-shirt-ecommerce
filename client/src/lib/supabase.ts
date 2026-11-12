import { createClient } from '@supabase/supabase-js'

// Only the public anon key belongs in the browser. Vite inlines every VITE_*
// value into the shipped bundle, so a database connection string
// (postgresql://user:password@host/db) or a service-role key must never be
// placed in one. All privileged database work runs through the Express API in
// `server/`, which holds SUPABASE_SERVICE_ROLE_KEY on the server only.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env. ' +
      'Copy client/.env.example to client/.env and fill in the project URL and public anon key.',
  )
}

// Row level security applies to this client: it can only do what the
// signed-in user's policies allow.
export const supabase = createClient(url, anon)

export type { User, Session } from '@supabase/supabase-js'
