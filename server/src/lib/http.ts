import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** An error carrying the HTTP status the client should receive. */
export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details)
export const unauthorized = (message = 'Sign in to continue.') => new HttpError(401, message)
export const forbidden = (message = 'You do not have access to this resource.') => new HttpError(403, message)
export const notFound = (message = 'Not found.') => new HttpError(404, message)
export const unavailable = (message = 'This service is temporarily unavailable.') =>
  new HttpError(503, message)

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
