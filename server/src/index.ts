import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[api] IJAZ LEGACY API listening on http://localhost:${env.port}`)
  console.log(`[api] health check: http://localhost:${env.port}/api/health`)
  console.log(`[api] allowed origins: ${env.corsOrigins.join(', ')}`)
})

function shutdown(signal: string): void {
  console.log(`[api] ${signal} received, closing server…`)
  server.close(() => process.exit(0))
  // Don't hang forever on keep-alive sockets.
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
