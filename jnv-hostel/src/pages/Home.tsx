import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ClipboardCheck, CalendarClock, Users, BarChart3, School, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getCurrentSession, SESSIONS } from '@/constants/sessions'
import { HOUSES } from '@/constants/houses'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'
import { getDailyAttendanceCounts, getTodaysLeaveSummary } from '@/services/reports'

const QUICK_ACTIONS = [
  { label: 'Mark Attendance', icon: ClipboardCheck, to: '/attendance', color: 'bg-navy-800 text-white hover:bg-navy-700',  roles: ['principal','vice_principal','house_master','associate_hm','warden']      },
  { label: 'Record Leave',    icon: CalendarClock,  to: '/leaves',     color: 'bg-amber-500 text-white hover:bg-amber-400', roles: ['principal','vice_principal','house_master','associate_hm','gate_guard']  },
  { label: 'Students',        icon: Users,          to: '/students',   color: 'bg-emerald-600 text-white hover:bg-emerald-500', roles: ['principal','vice_principal','house_master','associate_hm','admin']  },
  { label: 'Reports',         icon: BarChart3,      to: '/reports',    color: 'bg-sky-600 text-white hover:bg-sky-500',     roles: ['principal','vice_principal','house_master','admin']                     },
]

export default function Home() {
  const { user, hasRole } = useAuth()
  const today              = format(new Date(), 'EEEE, d MMMM yyyy')
  const currentSession     = getCurrentSession()
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [leaveSummary, setLeaveSummary] = useState({ activeLeaves: 0, overdueLeaves: 0 })
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const visibleActions = QUICK_ACTIONS.filter((a) => hasRole(a.roles as Parameters<typeof hasRole>[0]))

  useEffect(() => {
    const load = async () => {
      setLoadingSummary(true)
      setSummaryError(null)
      try {
        const todayDate = format(new Date(), 'yyyy-MM-dd')
        const counts = await getDailyAttendanceCounts(todayDate)
        const leaves = await getTodaysLeaveSummary(todayDate)
        setAttendanceCounts(counts)
        setLeaveSummary(leaves)
      } catch (err: unknown) {
        setSummaryError(err instanceof Error ? err.message : 'Failed to load dashboard summary')
      } finally {
        setLoadingSummary(false)
      }
    }

    void load()
  }, [])

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-navy-900 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <School size={16} className="text-gold-400" />
              <span className="text-gold-400 text-xs font-semibold uppercase tracking-wider">
                {import.meta.env.VITE_SCHOOL_NAME || 'JNV Hostel'}
              </span>
            </div>
            <h1 className="text-xl font-bold">
              Good {currentSession.id === 'morning' ? 'Morning' : currentSession.id === 'evening' ? 'Evening' : 'Night'},{' '}
              {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-navy-300 text-sm mt-0.5">{today}</p>
            <p className="text-navy-400 text-xs mt-0.5 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-navy-300 text-xs uppercase tracking-wide">Current Session</p>
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              <span className="text-2xl">{currentSession.icon}</span>
              <span className="font-bold">{currentSession.shortLabel}</span>
            </div>
            <p className="text-navy-400 text-xs mt-0.5">{currentSession.description}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {visibleActions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visibleActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-xl shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5',
                  action.color,
                )}
              >
                <action.icon size={22} />
                <span className="text-xs font-semibold text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {loadingSummary ? (
          <div className="card p-6 text-center text-slate-500">Loading summary…</div>
        ) : summaryError ? (
          <div className="card p-6 text-red-600">{summaryError}</div>
        ) : (
          <> 
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Present today</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{attendanceCounts.present ?? 0}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">On leave</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{attendanceCounts.leave ?? 0}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Overdue leaves</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{leaveSummary.overdueLeaves}</p>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Today's Roll-call Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOUSES.map((house: typeof HOUSES[number]) => (
            <div key={house.id} className="card overflow-hidden">
              <div
                className="px-4 py-3 flex items-center gap-3 border-b border-slate-50"
                style={{ borderLeftWidth: 4, borderLeftColor: house.color }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: house.color }}
                />
                <span className="font-semibold text-navy-800">{house.name} House</span>
              </div>
              <div className="divide-y divide-slate-50">
                {SESSIONS.map((session: typeof SESSIONS[number]) => (
                  <div key={session.id} className={clsx('flex items-center justify-between px-4 py-3', session.id === currentSession.id && 'bg-navy-50/50')}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{session.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{session.shortLabel}</p>
                        <p className="text-xs text-slate-400">{session.description}</p>
                      </div>
                    </div>
                    {/* Phase 5 will populate real data; placeholder for now */}
                    <Badge variant="default">Not started</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Offline note */}
      <div className="flex items-center gap-2 text-xs text-slate-400 justify-center py-2">
        <Wifi size={12} />
        <span>All data is cached locally — works without internet</span>
      </div>
    </div>
  )
}
