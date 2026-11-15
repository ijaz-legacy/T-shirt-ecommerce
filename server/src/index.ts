// Network defaults first: the Supabase client below depends on them.
import './lib/net.js'
import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[api] IJAZ LEGACY API listening on http://localhost:${env.port}`)
  console.log(`[api] health check: http://localhost:${env.port}/api/health`)
  console.log(`[api] allowed origins: ${env.corsOrigins.join(', ')}`)
  console.log(`[api] supabase host: ${safeHost(env.supabaseUrl)} · node ${process.version}`)
})

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '(invalid SUPABASE_URL)'
  }
}

function shutdown(signal: string): void {
  console.log(`[api] ${signal} received, closing server…`)
  server.close(() => process.exit(0))
  // Don't hang forever on keep-alive sockets.
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
