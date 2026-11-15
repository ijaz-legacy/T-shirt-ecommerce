import { Router } from 'express'
import { asyncRoute } from '../lib/http.js'
import { env } from '../config/env.js'
import { db, supabaseAdmin } from '../lib/supabase.js'

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '(invalid SUPABASE_URL)'
  }
}

export const healthRouter = Router()

healthRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const startedAt = process.hrtime.bigint()
    const { error } = await db().from('products').select('slug', { head: true, count: 'exact' }).limit(1)
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000

    res.json({
      status: error ? 'degraded' : 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        reachable: !error,
        error: error?.message ?? null,
        latencyMs: Math.round(latencyMs),
        mode: supabaseAdmin ? 'service-role' : 'anon (RLS enforced)',
        // Host only — the URL and keys stay private. This is what tells you the
        // deployment is pointed at the project you think it is.
        host: safeHost(env.supabaseUrl),
      },
      node: process.version,
    })
  }),
)
