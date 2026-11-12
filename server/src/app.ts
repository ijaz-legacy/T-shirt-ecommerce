import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { attachUser } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')

  // Only trust X-Forwarded-For when the deployment says how many hops sit in
  // front of us — otherwise a client could spoof its IP past the rate limit.
  if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy)
  app.use(
    helmet({
      // Images are served from Supabase Storage on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/curl requests have no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(null, false)
      },
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(env.isProduction ? 'combined' : 'dev'))

  // Reads the bearer token once; routes decide whether it is required.
  app.use(attachUser)

  app.get('/', (_req, res) => {
    res.json({
      name: 'IJAZ LEGACY API',
      version: '1.0.0',
      docs: '/api/health',
      resources: ['/api/products', '/api/stickers', '/api/orders', '/api/designs', '/api/uploads'],
    })
  })

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
