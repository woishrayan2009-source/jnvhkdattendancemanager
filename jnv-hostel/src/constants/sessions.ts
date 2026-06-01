// ─── Roll-call sessions ───────────────────────────────────────────────────────
export const SESSIONS = [
  {
    id:        'morning',
    label:     'Morning Roll-call',
    shortLabel: 'Morning',
    icon:      '🌅',
    startHour: 6,
    endHour:   8,
    description: 'Before breakfast assembly',
  },
  {
    id:        'evening',
    label:     'Evening Roll-call',
    shortLabel: 'Evening',
    icon:      '🌇',
    startHour: 17,
    endHour:   19,
    description: 'Pre-prep (before study hour)',
  },
  {
    id:        'night',
    label:     'Night Roll-call',
    shortLabel: 'Night',
    icon:      '🌙',
    startHour: 21,
    endHour:   23,
    description: 'Physical headcount — not leave-adjusted',
  },
] as const

export type SessionId = typeof SESSIONS[number]['id']

/**
 * Returns the session currently active, or the nearest one.
 *
 * Coverage:
 *  00–05 → night   (late-night / early morning before morning roll-call)
 *  06–07 → morning (06:00–08:00)
 *  08–16 → morning (between morning and evening — closest past session)
 *  17–20 → evening (17:00–19:00)
 *  21–23 → night   (21:00–23:00)
 */
export function getCurrentSession(): typeof SESSIONS[number] {
  const hour = new Date().getHours()
  // Check if we're within an active session window
  const active = SESSIONS.find((s) => hour >= s.startHour && hour < s.endHour)
  if (active) return active

  // Between sessions: return the most recently passed session
  if (hour < SESSIONS[0].startHour) {
    // Before morning roll-call (0–5am) → night was the last session
    return SESSIONS[SESSIONS.length - 1]
  }
  // Find the last session whose window has already ended
  const past = [...SESSIONS].reverse().find((s) => hour >= s.endHour)
  return past ?? SESSIONS[SESSIONS.length - 1]
}

// ─── Attendance statuses ──────────────────────────────────────────────────────
export const ATTENDANCE_STATUSES = [
  { id: 'present', label: 'Present',       color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  { id: 'absent',  label: 'Absent',        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'   },
  { id: 'leave',   label: 'On Leave',      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { id: 'sickbay', label: 'Sick Bay',      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200'},
  { id: 'duty',    label: 'Official Duty', color: 'text-cyan-600',   bg: 'bg-cyan-50',   border: 'border-cyan-200'  },
] as const

export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number]['id']

/** Cycle order for tap-to-cycle UX (Present → Absent → On Leave → back) */
export const STATUS_CYCLE: AttendanceStatus[] = ['present', 'absent', 'leave']

export const STATUS_MAP = Object.fromEntries(
  ATTENDANCE_STATUSES.map((s) => [s.id, s])
) as Record<AttendanceStatus, typeof ATTENDANCE_STATUSES[number]>
