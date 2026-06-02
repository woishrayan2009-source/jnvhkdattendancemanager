import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, AlertTriangle, Search, Repeat, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { HOUSES } from '@/constants/houses'
import { getCurrentSession, SESSIONS, STATUS_CYCLE, STATUS_MAP } from '@/constants/sessions'
import { getStudentsForHouse, getAttendanceRecords, saveAttendanceRecords } from '@/services/attendance'
import type { AttendanceStatus, HouseId, SessionId, Student } from '@/types'

const DATE = format(new Date(), 'yyyy-MM-dd')

export default function Attendance() {
  const { user } = useAuth()
  const [selectedHouse, setSelectedHouse] = useState<HouseId | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionId>(getCurrentSession().id)
  const [students, setStudents] = useState<Student[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableHouses = useMemo(() => {
    if (!user) return HOUSES
    if (user.assigned_house_ids === null) return HOUSES
    return HOUSES.filter((house) => user.assigned_house_ids?.includes(house.id))
  }, [user])

  useEffect(() => {
    if (!selectedHouse && availableHouses.length > 0) {
      setSelectedHouse(availableHouses[0].id)
    }
  }, [availableHouses, selectedHouse])

  useEffect(() => {
    const load = async () => {
      if (!selectedHouse) return
      setLoading(true)
      setError(null)
      try {
        const houseStudents = await getStudentsForHouse(selectedHouse)
        const attendance = await getAttendanceRecords(DATE, selectedSession, selectedHouse)

        setStudents(houseStudents)

        const nextStatusMap: Record<string, AttendanceStatus> = {}
        houseStudents.forEach((student) => {
          const record = attendance.find((item) => item.student_id === student.id)
          nextStatusMap[student.id] = (record?.status ?? 'present') as AttendanceStatus
        })
        setStatusMap(nextStatusMap)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load attendance data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedHouse, selectedSession])

  const filteredStudents = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (normalized === '') return students
    return students.filter((student) =>
      student.full_name.toLowerCase().includes(normalized) ||
      student.admission_no.toLowerCase().includes(normalized) ||
      student.roll_no.toLowerCase().includes(normalized),
    )
  }, [search, students])

  const statusCounts = useMemo(() => {
    return Object.values(statusMap).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<AttendanceStatus, number>)
  }, [statusMap])

  const handleToggleStatus = (studentId: string) => {
    setStatusMap((current) => {
      const currentStatus = current[studentId] ?? 'present'
      const nextIndex = (STATUS_CYCLE.indexOf(currentStatus) + 1) % STATUS_CYCLE.length
      return { ...current, [studentId]: STATUS_CYCLE[nextIndex] }
    })
  }

  const handleMarkAllPresent = () => {
    setStatusMap((current) => {
      const next: Record<string, AttendanceStatus> = {}
      students.forEach((student) => {
        next[student.id] = 'present'
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      if (!user || !selectedHouse) throw new Error('Missing user or house selection')
      const payload = students.map((student) => ({
        student_id: student.id,
        date: DATE,
        session: selectedSession,
        status: statusMap[student.id] ?? 'present',
        marked_by: user.id,
      }))
      await saveAttendanceRecords(payload)
      setMessage('Attendance saved successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Mark roll-call for {format(new Date(), 'dd MMM yyyy')}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Selected house</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availableHouses.map((house) => (
                  <button
                    key={house.id}
                    onClick={() => setSelectedHouse(house.id)}
                    className={clsx(
                      'rounded-2xl px-4 py-3 text-left text-sm font-semibold transition',
                      selectedHouse === house.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    )}
                  >
                    {house.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Roll-call session</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SESSIONS.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={clsx(
                      'rounded-full px-4 py-2 text-xs font-semibold transition',
                      selectedSession === session.id
                        ? 'bg-navy-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {session.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, admission no, roll no"
                className="input-base pl-10"
              />
            </div>
            <Button variant="secondary" onClick={handleMarkAllPresent} leftIcon={<Repeat size={16} />}>
              Mark all present
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(statusCounts).map(([status, count]) => {
              const meta = STATUS_MAP[status as AttendanceStatus]
              return (
                <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px]">{meta.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1.8fr_1.1fr_1.1fr] gap-0.5 bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-500 px-4 py-3">
              <span>Name</span>
              <span className="hidden sm:inline">Class / Section</span>
              <span>Status</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading student list…</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No students found.</div>
            ) : (
              filteredStudents.map((student) => {
                const status = statusMap[student.id] ?? 'present'
                const meta = STATUS_MAP[status]
                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggleStatus(student.id)}
                    className="grid w-full grid-cols-[1.8fr_1.1fr_1.1fr] items-center gap-0.5 border-t border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{student.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">Adm. {student.admission_no} · Roll {student.roll_no}</p>
                    </div>
                    <div className="hidden sm:block text-sm text-slate-600">{student.class_no} • {student.section}</div>
                    <div className="flex items-center justify-end">
                      <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', meta.bg, meta.color, meta.border)}>
                        {meta.label}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-emerald-700">{message}</p>}
            </div>
            <Button onClick={handleSave} fullWidth={false} loading={saving} leftIcon={<CheckCircle2 size={16} />}>
              Save attendance
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className="text-navy-800" />
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Session active</p>
                <p className="text-lg font-semibold text-slate-900">{selectedSession === 'morning' ? 'Morning Roll-call' : selectedSession === 'evening' ? 'Evening Roll-call' : 'Night Roll-call'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Use the list to update student statuses. Tap any row to cycle through Present, Absent, and On Leave.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Attendance rules</p>
                <p className="text-sm text-slate-500 mt-1">House Masters can edit same-day records. Night roll-call is a final physical headcount.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
