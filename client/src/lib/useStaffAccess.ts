import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { OWNER_EMAILS, fetchMyRole, isOwner } from '../lib/admin'

interface StaffAccess {
  /** False until the role lookup finishes, so gated UI can wait. */
  ready: boolean
  isStaff: boolean
  isOwner: boolean
}

/**
 * Resolves the signed-in user's admin rights.
 *
 * The owner email is known locally, so that case never waits on the network.
 * Everyone else is checked against the `staff` table, which row-level security
 * restricts to their own row.
 */
export function useStaffAccess(): StaffAccess {
  const { user, loading } = useAuth()
  const [access, setAccess] = useState<StaffAccess>({
    ready: false,
    isStaff: false,
    isOwner: false,
  })

  const email = user?.email?.toLowerCase() ?? null
  const owner = isOwner(user ? { email: user.email ?? null } : null)

  useEffect(() => {
    if (loading) return

    if (!email) {
      setAccess({ ready: true, isStaff: false, isOwner: false })
      return
    }

    if (OWNER_EMAILS.includes(email as (typeof OWNER_EMAILS)[number])) {
      setAccess({ ready: true, isStaff: true, isOwner: true })
      return
    }

    let cancelled = false
    setAccess(a => ({ ...a, ready: false }))
    fetchMyRole(email)
      .then(role => {
        if (!cancelled) setAccess({ ready: true, isStaff: role !== null, isOwner: false })
      })
      .catch(() => {
        if (!cancelled) setAccess({ ready: true, isStaff: false, isOwner: false })
      })

    return () => { cancelled = true }
  }, [email, loading])

  return {
    ready: access.ready,
    isStaff: access.isStaff || owner,
    isOwner: access.isOwner || owner,
  }
}
