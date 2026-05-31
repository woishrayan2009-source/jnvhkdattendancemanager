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

/** Returns the session that should currently be active, or the last one */
export function getCurrentSession(): typeof SESSIONS[number] {
  const hour = new Date().getHours()
  return (
    SESSIONS.find((s) => hour >= s.startHour && hour < s.endHour) ??
    SESSIONS[SESSIONS.length - 1]
  )
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
