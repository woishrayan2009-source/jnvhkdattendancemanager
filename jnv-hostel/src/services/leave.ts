import { supabase } from '@/lib/supabase'
import type { LeaveRequest, StaffRole, HouseId } from '@/types'

async function getStudentIdsForHouses(houseIds: HouseId[]) {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .in('house_id', houseIds)

  if (error) throw error
  return (data ?? []).map((record) => record.id)
}

export async function getPendingLeaves(role: StaffRole, houseIds: HouseId[] | null) {
  if (role === 'house_master' || role === 'associate_hm') {
    if (!houseIds || houseIds.length === 0) return []
    const ids = await getStudentIdsForHouses(houseIds)
    if (ids.length === 0) return []
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .in('student_id', ids)
      .eq('status', 'pending')
      .order('from_date', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .in('status', ['pending', 'approved_hm'])
    .order('from_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function approveLeave(
  leaveId: string,
  approverId: string,
  approverRole: StaffRole,
) {
  const status = approverRole === 'house_master' || approverRole === 'associate_hm'
    ? 'approved_hm'
    : 'approved_principal'

  const { error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_by: approverId, updated_at: new Date().toISOString() })
    .eq('id', leaveId)

  if (error) throw error
}

export async function rejectLeave(
  leaveId: string,
  reviewerId: string,
  reason?: string,
) {
  const { error } = await supabase
    .from('leave_requests')
    .update({ status: 'rejected', reviewed_by: reviewerId, review_remarks: reason ?? null, updated_at: new Date().toISOString() })
    .eq('id', leaveId)

  if (error) throw error
}

export async function getTodaysActiveLeaves(date: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .lte('from_date', date)
    .gte('to_date', date)
    .in('status', ['approved_hm', 'approved_principal'])
    .is('returned_at', null)
    .order('to_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getOverdueLeaves(date: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .lt('to_date', date)
    .in('status', ['approved_hm', 'approved_principal'])
    .is('returned_at', null)
    .order('to_date', { ascending: true })

  if (error) throw error
  return data ?? []
}
