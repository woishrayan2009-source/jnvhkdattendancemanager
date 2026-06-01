import { useState, useEffect } from 'react'
import { SESSIONS } from '../lib/supabase'

function getCurrentSession() {
  const now = new Date()
  const t = now.getHours() * 60 + now.getMinutes()
  if (t >= 5 * 60 && t < 13 * 60) return SESSIONS.find(s => s.type === 'morning')
  if (t >= 13 * 60 && t < 20 * 60) return SESSIONS.find(s => s.type === 'evening')
  return SESSIONS.find(s => s.type === 'night')
}

/**
 * Returns the current attendance session and re-evaluates every minute.
 * Previously used useMemo([]) which never updated after mount — now uses
 * useState + setInterval so the session updates in real time.
 */
export function useCurrentSession() {
  const [session, setSession] = useState(getCurrentSession)

  useEffect(() => {
    // Re-check every 60 seconds in case the session boundary crosses
    const id = setInterval(() => {
      setSession(getCurrentSession())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  return session
}
