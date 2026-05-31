import { useMemo } from 'react'
import { SESSIONS } from '../lib/supabase'

export function useCurrentSession() {
  return useMemo(() => {
    const now = new Date()
    const h   = now.getHours()
    const m   = now.getMinutes()
    const t   = h * 60 + m  // current time in minutes

    // Morning: 05:00 – 12:59
    if (t >= 5 * 60 && t < 13 * 60) {
      return SESSIONS.find(s => s.type === 'morning')
    }
    // Evening: 13:00 – 19:59
    if (t >= 13 * 60 && t < 20 * 60) {
      return SESSIONS.find(s => s.type === 'evening')
    }
    // Night: 20:00 – 04:59 (next day)
    return SESSIONS.find(s => s.type === 'night')
  }, [])
}
