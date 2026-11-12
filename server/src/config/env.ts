import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load server/.env next to this package, whatever the working directory is.
// (Works from src/config and from dist/config alike.)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
config({ path: resolve(packageRoot, '.env') })

/** An empty/zero PORT from the shell falls back to 4000. */
function readPort(): number {
  const parsed = Number(process.env.PORT)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4000
}

/**
 * Number of trusted proxy hops in front of the API. 0 = off.
 * Set TRUST_PROXY=1 (Render, Railway, Fly, nginx) so req.ip is the real client
 * and the per-IP rate limit does not lump every visitor into one bucket.
 */
function readTrustProxy(): number {
  const parsed = Number(process.env.TRUST_PROXY)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

/**
 * All server configuration lives here so nothing else in the app calls
 * process.env directly. Values come from `server/.env`.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: readPort(),
  trustProxy: readTrustProxy(),

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),

  supabaseUrl: (process.env.SUPABASE_URL ?? '').trim(),
  supabaseAnonKey: (process.env.SUPABASE_ANON_KEY ?? '').trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
  storageBucket: (process.env.SUPABASE_STORAGE_BUCKET ?? 'client-images').trim(),

  ownerEmails: (process.env.OWNER_EMAILS ?? 'theijazlegacy@gmail.com,ijazlegacy@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
} as const

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && env.ownerEmails.includes(email.toLowerCase())
}

/** Fails fast with a readable message when the Supabase connection is missing. */
export function assertSupabaseEnv(): void {
  const missing = [
    ['SUPABASE_URL', env.supabaseUrl],
    ['SUPABASE_ANON_KEY', env.supabaseAnonKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(
      `Missing server environment variables: ${missing.join(', ')}. ` +
        'Copy server/.env.example to server/.env and fill in your Supabase keys.',
    )
  }

  assertProductionEnv()
}

/**
 * Refuses to start a production deployment that is quietly misconfigured.
 * These checks catch the common ways secrets and origins leak: a missing
 * service-role key, a plaintext URL, or a localhost CORS allow-list copied
 * from development.
 */
function assertProductionEnv(): void {
  if (!env.isProduction) return

  const problems: string[] = []
  if (!env.supabaseServiceRoleKey) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY is required in production')
  }
  if (!/^https:\/\//i.test(env.supabaseUrl)) {
    problems.push('SUPABASE_URL must be an https:// URL in production')
  }
  if (env.corsOrigins.length === 0) {
    problems.push('CORS_ORIGINS must list the production site origin')
  }
  if (env.corsOrigins.some(origin => /localhost|127\.0\.0\.1/i.test(origin))) {
    problems.push('CORS_ORIGINS must not include localhost in production')
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start [production]: ${problems.join('; ')}.`)
  }
}
