import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, ClipboardCheck, Loader2, School, Users, Wifi, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getCurrentSession } from '@/constants/sessions'
import { Badge } from '@/components/ui/Badge'
import HostelCard from '@/components/ui/HostelCard'
import { clsx } from 'clsx'
import { getAttendanceDashboard } from '@/services/reports'
import { HOUSES, HOSTEL_CONFIG, SECTION_TABS } from '@/constants/houses'
import type { SectionKey } from '@/constants/houses'
import type { AttendanceDashboardData } from '@/services/reports'

const QUICK_ACTIONS = [
  { label: 'Mark Attendance', icon: ClipboardCheck, to: '/attendance', color: 'bg-navy-800 text-white hover:bg-navy-700',  roles: ['principal','vice_principal','house_master','associate_hm','warden']      },
  { label: 'Record Leave',    icon: CalendarClock,  to: '/leaves',     color: 'bg-amber-500 text-white hover:bg-amber-400', roles: ['principal','vice_principal','house_master','associate_hm','gate_guard']  },
  { label: 'Students',        icon: Users,          to: '/students',   color: 'bg-emerald-600 text-white hover:bg-emerald-500', roles: ['principal','vice_principal','house_master','associate_hm','admin']  },
  { label: 'Reports',         icon: BarChart3,      to: '/reports',    color: 'bg-sky-600 text-white hover:bg-sky-500',     roles: ['principal','vice_principal','house_master','admin']                     },
]

const ALERT_LIMIT = 5
const LOW_ATTENDANCE_THRESHOLD = 0.7
const ABSENCE_ALERT_THRESHOLD = 0.2

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target)

  useEffect(() => {
    const duration = 300
    const start = performance.now()
    const initial = value
    const diff = target - initial

    if (diff === 0) {
      setValue(target)
      return
    }

    let raf: number
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration)
      setValue(Math.round(initial + diff * progress))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return value
}

interface DashboardAlert {
  id: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info'
}

export default function Home() {
  const { user, hasRole } = useAuth()
  const todayLabel = format(new Date(), 'EEEE, d MMMM yyyy')
  const currentSession = getCurrentSession()
  const [activeTab, setActiveTab] = useState<SectionKey>('sub-junior')
  const [dashboardData, setDashboardData] = useState<AttendanceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([])
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const visibleActions = QUICK_ACTIONS.filter((action) => hasRole(action.roles as Parameters<typeof hasRole>[0]))

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const date = format(new Date(), 'yyyy-MM-dd')
        const data = await getAttendanceDashboard(date, currentSession.id)
        setDashboardData(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [currentSession.id])

  const sectionHostels = HOSTEL_CONFIG[activeTab]

  const sectionSummary = useMemo(() => {
    if (!dashboardData) {
      return { total: 0, present: 0, onLeave: 0, absent: 0 }
    }

    return sectionHostels.reduce(
      (summary, hostel) => {
        const stats = dashboardData.hostels[hostel.id]
        if (!stats) return summary

        summary.total += stats.totalStudents
        summary.present += stats.present
        summary.onLeave += stats.onLeave
        summary.absent += stats.unexplainedAbsent
        return summary
      },
      { total: 0, present: 0, onLeave: 0, absent: 0 },
    )
  }, [dashboardData, sectionHostels])

  const animatedTotal = useAnimatedNumber(sectionSummary.total)
  const animatedPresent = useAnimatedNumber(sectionSummary.present)
  const animatedLeave = useAnimatedNumber(sectionSummary.onLeave)
  const animatedAbsent = useAnimatedNumber(sectionSummary.absent)

  const lastUpdatedText = dashboardData?.lastUpdated
    ? formatDistanceToNow(new Date(dashboardData.lastUpdated), { addSuffix: true })
    : 'Updating…'

  const now = new Date()
  const cutoff = new Date()
  cutoff.setHours(currentSession.endHour + 1, 0, 0, 0)
  const isPastCutoff = now > cutoff

  const allAlerts = useMemo(() => {
    if (!dashboardData) return [] as DashboardAlert[]

    return sectionHostels.flatMap((hostel) => {
      const stats = dashboardData.hostels[hostel.id]
      if (!stats || stats.totalStudents === 0) return []

      const alerts: DashboardAlert[] = []
      const absentRate = stats.unexplainedAbsent / stats.totalStudents
      const presentRate = stats.present / stats.totalStudents

      if (absentRate > ABSENCE_ALERT_THRESHOLD) {
        alerts.push({
          id: `${hostel.id}-absence`,
          title: 'High Absence Alert',
          message: `${hostel.name}: ${stats.unexplainedAbsent} students unexplained absent (${Math.round(absentRate * 100)}%)`,
          severity: 'critical',
        })
      }

      if (presentRate < LOW_ATTENDANCE_THRESHOLD) {
        alerts.push({
          id: `${hostel.id}-low-attendance`,
          title: 'Low Attendance Warning',
          message: `${hostel.name}: Present rate is ${Math.round(presentRate * 100)}%`,
          severity: 'warning',
        })
      }

      if (isPastCutoff && stats.effective === 0) {
        alerts.push({
          id: `${hostel.id}-not-submitted`,
          title: 'Attendance not submitted',
          message: `${hostel.name}: Attendance not submitted for today`,
          severity: 'info',
        })
      }

      return alerts
    })
  }, [dashboardData, sectionHostels, isPastCutoff])

  const visibleAlerts = allAlerts.filter((alert) => !dismissedAlertIds.includes(alert.id)).slice(0, ALERT_LIMIT)
  const hiddenAlertCount = Math.max(0, allAlerts.length - visibleAlerts.length)

  const summaryTiles = [
    { label: 'Total Students', value: animatedTotal, color: 'bg-navy-900 text-white', icon: Users },
    { label: 'Present Today', value: animatedPresent, color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
    { label: 'On Leave', value: animatedLeave, color: 'bg-amber-500 text-white', icon: CalendarClock },
    { label: 'Unexplained Absent', value: animatedAbsent, color: 'bg-slate-800 text-white', icon: AlertTriangle },
  ]

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return

    const nextIndex = event.key === 'ArrowRight'
      ? (index + 1) % SECTION_TABS.length
      : (index - 1 + SECTION_TABS.length) % SECTION_TABS.length

    const nextTab = SECTION_TABS[nextIndex].id
    setActiveTab(nextTab)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="relative overflow-hidden bg-gradient-to-r from-navy-900 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <School size={16} className="text-amber-300" />
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">
                {import.meta.env.VITE_SCHOOL_NAME || 'JNV Hostel'}
              </span>
            </div>
            <h1 className="text-2xl font-bold">Good {currentSession.id === 'morning' ? 'Morning' : currentSession.id === 'evening' ? 'Evening' : 'Night'}, {user?.full_name?.split(' ')[0]}!</h1>
            <p className="text-slate-300 text-sm mt-1">{todayLabel}</p>
            <p className="text-slate-300 text-xs mt-2 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Current Session</p>
            <div className="mt-3 flex items-center justify-end gap-2 text-lg font-semibold text-white">
              <span>{currentSession.icon}</span>
              <span>{currentSession.shortLabel}</span>
            </div>
            <p className="text-slate-300 text-xs mt-1">{currentSession.description}</p>
          </div>
        </div>
      </section>

      {visibleActions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visibleActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-3xl p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
                  action.color,
                )}
              >
                <action.icon size={22} />
                <span className="text-xs font-semibold">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryTiles.map((tile) => (
              <div key={tile.label} className={clsx('rounded-3xl p-5 shadow-card', tile.color)}>
                <div className="flex items-center justify-between gap-3 text-sm uppercase tracking-[0.32em] text-white/80">
                  <span>{tile.label}</span>
                  <tile.icon size={18} />
                </div>
                <p className="mt-5 text-3xl font-semibold text-white">{loading ? <Loader2 className="animate-spin" /> : tile.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Section</p>
                <h2 className="text-xl font-semibold text-slate-900">{SECTION_TABS.find((tab) => tab.id === activeTab)?.label}</h2>
              </div>
              <p className="text-sm text-slate-500">Last updated {lastUpdatedText}</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {SECTION_TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  aria-selected={activeTab === tab.id}
                  className={clsx(
                    'rounded-full whitespace-nowrap border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-400',
                    activeTab === tab.id
                      ? 'border-amber-500 bg-amber-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sectionHostels.map((hostel) => (
              <HostelCard key={hostel.id} hostel={hostel} stats={dashboardData?.hostels[hostel.id]} />
            ))}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">All Houses — Quick View</p>
                <h2 className="text-xl font-semibold text-slate-900">House performance across all hostels</h2>
              </div>
              <p className="text-sm text-slate-500">Persistent house-level trendboard</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {HOUSES.map((house) => {
                const stats = dashboardData?.houses[house.id] ?? {
                  totalStudents: 0,
                  present: 0,
                  onLeave: 0,
                  unexplainedAbsent: 0,
                  effective: 0,
                }
                const total = stats.totalStudents
                const presentPct = total ? Math.round((stats.present / total) * 100) : 0
                const leavePct = total ? Math.round((stats.onLeave / total) * 100) : 0
                const absentPct = total ? Math.round((stats.unexplainedAbsent / total) * 100) : 0

                return (
                  <div key={house.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: house.color }} />
                        <span>{house.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{stats.effective}/{total} effective</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-white p-3 text-center">
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Total</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-3 text-center">
                        <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">Present</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.present}</p>
                        <p className="text-sm text-emerald-700">{presentPct}%</p>
                      </div>
                      <div className="rounded-3xl bg-white p-3 text-center">
                        <p className="text-xs uppercase tracking-[0.32em] text-amber-700">Leave</p>
                        <p className="mt-2 text-2xl font-semibold text-amber-900">{stats.onLeave}</p>
                        <p className="text-sm text-amber-700">{leavePct}%</p>
                      </div>
                      <div className="rounded-3xl bg-white p-3 text-center">
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Absent</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.unexplainedAbsent}</p>
                        <p className="text-sm text-slate-500">{absentPct}%</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <AlertTriangle size={20} className="text-amber-500" />
                <span>Alerts</span>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{allAlerts.length} total</span>
            </div>

            {visibleAlerts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  <span>All clear! No alerts at this time.</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {visibleAlerts.map((alert) => {
                  const tone = alert.severity === 'critical'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-sky-50 border-sky-200 text-sky-700'

                  return (
                    <div key={alert.id} className={clsx('rounded-3xl border p-4', tone)}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{alert.title}</p>
                          <p className="mt-1 text-sm leading-6">{alert.message}</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setDismissedAlertIds((ids) => [...ids, alert.id])}
                          aria-label="Dismiss alert"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {hiddenAlertCount > 0 && (
                  <button
                    type="button"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"
                    onClick={() => setDismissedAlertIds([])}
                  >
                    + {hiddenAlertCount} more alerts — show all
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}
