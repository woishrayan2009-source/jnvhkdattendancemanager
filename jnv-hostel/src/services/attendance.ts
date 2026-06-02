import { supabase } from '@/lib/supabase'
import type { AttendanceRecord, AttendanceStatus, HouseId, SessionId, Student } from '@/types'
import { ATTENDANCE_STATUSES } from '@/constants/sessions'

export async function getStudentsForHouse(houseId: HouseId): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('house_id', houseId)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getAttendanceRecords(
  date: string,
  session: SessionId,
  houseId: HouseId,
): Promise<AttendanceRecord[]> {
  const students = await getStudentsForHouse(houseId)
  if (students.length === 0) return []

  const studentIds = students.map((student) => student.id)
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .in('student_id', studentIds)
    .eq('date', date)
    .eq('session', session)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function saveAttendanceRecords(
  records: Array<{
    student_id: string
    date: string
    session: SessionId
    status: AttendanceStatus
    marked_by: string
    remarks?: string
  }>,
): Promise<void> {
  const payload = records.map((record) => ({
    id: `${record.student_id}_${record.date}_${record.session}`,
    ...record,
    marked_at: new Date().toISOString(),
    is_finalized: false,
  }))

  const { error } = await supabase
    .from('attendance_records')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    throw error
  }
}

export async function getAttendanceSummary(date: string) {
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
