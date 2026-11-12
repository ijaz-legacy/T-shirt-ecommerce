import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import type { MulterError } from 'multer'
import { HttpError } from '../lib/http.js'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` })
}

interface ErrorWithType extends Error {
  status?: number
  code?: string
  type?: string
}

export function errorHandler(
  error: ErrorWithType,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed.',
      issues: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) })
    return
  }

  // multer surface errors (file too large, wrong field name…)
  if (error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large') {
    res.status(413).json({ error: 'That file is too large. Maximum size is 5 MB.' })
    return
  }
  if (error.code?.startsWith?.('LIMIT_')) {
    res.status(400).json({ error: 'Upload rejected. Send one image in the "file" field.' })
    return
  }

  console.error('[api] unhandled error:', error)
  res.status(500).json({ error: 'Something went wrong on our side.' })
}

export type { MulterError }
