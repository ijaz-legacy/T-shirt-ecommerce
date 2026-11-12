import type { NextFunction, Request, Response } from 'express'
import { isOwnerEmail } from '../config/env.js'
import { HttpError } from '../lib/http.js'
import { db, supabaseAnon } from '../lib/supabase.js'
import type { AuthUser } from '../types/index.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

async function resolveRole(userId: string, email: string | null): Promise<AuthUser['role']> {
  if (isOwnerEmail(email)) return 'owner'
  if (!email) return 'customer'

  const { data } = await db()
    .from('staff')
    .select('role, active')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (data && (data as { active: boolean }).active) {
    return (data as { role: 'owner' | 'staff' }).role === 'owner' ? 'owner' : 'staff'
  }
  return 'customer'
}

/** Reads the bearer token and attaches `req.user` when it is valid. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req)
  if (!token) {
    next()
    return
  }
  try {
    const { data, error } = await supabaseAnon.auth.getUser(token)
    if (error || !data.user) {
      next()
      return
    }
    const email = data.user.email ?? null
    req.user = {
      id: data.user.id,
      email,
      role: await resolveRole(data.user.id, email),
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Sign in to continue.'))
    return
  }
  next()
}

export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Sign in to continue.'))
    return
  }
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    next(new HttpError(403, 'Staff access required.'))
    return
  }
  next()
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Sign in to continue.'))
    return
  }
  if (req.user.role !== 'owner') {
    next(new HttpError(403, 'Owner access required.'))
    return
  }
  next()
}
