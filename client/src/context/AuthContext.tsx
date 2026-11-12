import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type SupabaseClient } from '@supabase/supabase-js'
import { supabase, type User, type Session } from '../lib/supabase'

export interface SignUpResult {
  error: string | null
  /** True when the project requires email confirmation, so no session exists yet. */
  needsConfirmation: boolean
}

interface AuthCtx {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Use the Supabase client directly (the current target). Postgres Cloud
  // support is kept here for backwards compatibility.
  const authClient = supabase as SupabaseClient<any>

  useEffect(() => {
    const initAuth = async () => {
      try {
        const s = await authClient.auth.getSession()
        if (s.data?.session) {
          setSession(s.data.session)
          setUser(s.data.session.user)
        }
      } catch {
        // Auth errors are logged; the user may not be signed in yet.
      }
      setLoading(false)
    }
    initAuth()

    let unsubscribe: (() => void) | undefined
    if (authClient.auth) {
      const { data: { subscription } } = authClient.auth.onAuthStateChange(
        (_event: unknown, session: Session | null) => {
          setSession(session)
          setUser(session?.user ?? null)
        },
      )
      unsubscribe = subscription.unsubscribe
    }
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const r = await authClient.auth.signInWithPassword?.({ email, password })
    return r?.error ? (r.error as Error).message : null
  }

  async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
    const r = await authClient.auth.signUp?.({ email, password, options: { data: { name } } })
    if (!r) return { error: 'Sign up is unavailable.', needsConfirmation: false }
    if (r.error) return { error: (r.error as Error).message, needsConfirmation: false }
    // With email confirmation enabled Supabase returns a user but no session.
    return { error: null, needsConfirmation: !r.data?.session }
  }

  async function signOut() {
    await authClient.auth.signOut?.()
  }

  return (
    <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
