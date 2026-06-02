import { supabase } from '@/lib/supabase'
import { ATTENDANCE_STATUSES } from '@/constants/sessions'
import type { AttendanceStatus } from '@/types'

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
