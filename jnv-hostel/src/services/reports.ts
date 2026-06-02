import { supabase } from '@/lib/supabase'
import { ATTENDANCE_STATUSES } from '@/constants/sessions'
import { HOUSES, HOSTEL_CONFIG } from '@/constants/houses'
import type { AttendanceStatus, SessionId, HouseId, Student } from '@/types'

export interface HouseAttendanceSummary {
  totalStudents: number
  present: number
  onLeave: number
  unexplainedAbsent: number
  effective: number
}

export interface HostelAttendanceSummary extends HouseAttendanceSummary {
  id: string
  name: string
  houses: HouseId[]
  classes: readonly number[]
  description?: string
}

export interface AttendanceDashboardData {
  houses: Record<HouseId, HouseAttendanceSummary>
  hostels: Record<string, HostelAttendanceSummary>
  lastUpdated: string
}

const EMPTY_HOUSE_SUMMARY: HouseAttendanceSummary = {
  totalStudents: 0,
  present: 0,
  onLeave: 0,
  unexplainedAbsent: 0,
  effective: 0,
}

export async function getAttendanceDashboard(date: string, session: SessionId) {
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, house_id, class_no, gender')
    .eq('is_active', true)

  if (studentError) throw studentError

  const activeStudents = (students ?? []) as Student[]
  const attendanceMap = new Map<string, AttendanceStatus>()

  if (activeStudents.length > 0) {
    const studentIds = activeStudents.map((student) => student.id)
    const { data: records, error: recordError } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .in('student_id', studentIds)
      .eq('date', date)
      .eq('session', session)

    if (recordError) throw recordError

    ;(records ?? []).forEach((record) => {
      if (record.student_id && record.status) {
        attendanceMap.set(record.student_id, record.status as AttendanceStatus)
      }
    })
  }

  const houses = HOUSES.reduce((acc, house) => {
    acc[house.id] = { ...EMPTY_HOUSE_SUMMARY }
    return acc
  }, {} as Record<HouseId, HouseAttendanceSummary>)

  activeStudents.forEach((student) => {
    const houseId = student.house_id as HouseId
    const summary = houses[houseId]
    if (!summary) return

    summary.totalStudents += 1
    const status = attendanceMap.get(student.id)

    if (status === 'present') {
      summary.present += 1
      summary.effective += 1
    } else if (status === 'leave') {
      summary.onLeave += 1
      summary.effective += 1
    } else if (status === 'absent') {
      summary.unexplainedAbsent += 1
      summary.effective += 1
    }
  })

  const hostels = Object.values(HOSTEL_CONFIG).flat().reduce((acc, hostel) => {
    const summary: HostelAttendanceSummary = {
      id: hostel.id,
      name: hostel.name,
      houses: hostel.houses,
      classes: hostel.classes,
      description: hostel.description,
      totalStudents: 0,
      present: 0,
      onLeave: 0,
      unexplainedAbsent: 0,
      effective: 0,
    }

    hostel.houses.forEach((houseId) => {
      const houseSummary = houses[houseId]
      if (!houseSummary) return
      summary.totalStudents += houseSummary.totalStudents
      summary.present += houseSummary.present
      summary.onLeave += houseSummary.onLeave
      summary.unexplainedAbsent += houseSummary.unexplainedAbsent
      summary.effective += houseSummary.effective
    })

    acc[hostel.id] = summary
    return acc
  }, {} as Record<string, HostelAttendanceSummary>)

  return {
    houses,
    hostels,
    lastUpdated: new Date().toISOString(),
  }
}

export async function getDailyAttendanceCounts(date: string) {
  const summary = await Promise.all(
    ATTENDANCE_STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('date', date)
        .eq('status', status.id)

      if (error) throw error
      return [status.id, count ?? 0] as const
    }),
  )

  return Object.fromEntries(summary) as Record<AttendanceStatus, number>
}

export async function getTodaysLeaveSummary(date: string) {
  const { count: activeCount, error: activeError } = await supabase
    .from('leave_requests')
    .select('id', { count: 'exact', head: true })
    .lte('from_date', date)
    .gte('to_date', date)
    .in('status', ['approved_hm', 'approved_principal'])

  if (activeError) throw activeError

  const { count: overdueCount, error: overdueError } = await supabase
    .from('leave_requests')
    .select('id', { count: 'exact', head: true })
    .lt('to_date', date)
    .in('status', ['approved_hm', 'approved_principal'])
    .is('returned_at', null)

  if (overdueError) throw overdueError

  return {
    activeLeaves: activeCount ?? 0,
    overdueLeaves: overdueCount ?? 0,
  }
}
