import { Router } from 'express'
import { asyncRoute } from '../lib/http.js'
import { db, supabaseAdmin } from '../lib/supabase.js'

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
      },
    })
  }),
)
