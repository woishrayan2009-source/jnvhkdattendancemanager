import { db, LeaveRequest, LeaveStatus, LeaveType, PickupMode } from '../db/schema';
import { supabase } from '../lib/supabase';
import { isAfter, isBefore, parseISO } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface LeaveSubmitInput {
  student_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  departure_time: string;
  return_time: string;
  reason: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  pickup_mode: PickupMode;
  alt_emergency_contact: string;
  submitted_by: string;
}

// ─── Overlap check ─────────────────────────────────────────────────────────
async function hasOverlap(studentId: string, startDate: string, endDate: string, excludeId?: string): Promise<boolean> {
  const existing = await db.leave_requests
    .where('student_id').equals(studentId)
    .filter(r => r.status === 'APPROVED' || r.status === 'PENDING_HM' || r.status === 'PENDING_PRINCIPAL')
    .toArray();

  const newStart = parseISO(startDate);
  const newEnd   = parseISO(endDate);

  return existing.some(r => {
    if (excludeId && r.id === excludeId) return false;
    const rStart = parseISO(r.start_date);
    const rEnd   = parseISO(r.end_date);
    // Overlap: new range intersects existing range
    return !isAfter(newStart, rEnd) && !isBefore(newEnd, rStart);
  });
}

// ─── submitLeaveRequest ────────────────────────────────────────────────────
export async function submitLeaveRequest(data: LeaveSubmitInput): Promise<LeaveRequest> {
  const overlap = await hasOverlap(data.student_id, data.start_date, data.end_date);
  if (overlap) {
    throw new Error('This student already has an active leave request overlapping those dates.');
  }

  const now = new Date().toISOString();
  const leave: LeaveRequest = {
    id: crypto.randomUUID(),
    ...data,
    status: 'PENDING_HM',
    approved_by: null,
    rejection_reason: null,
    actual_return_time: null,
    created_at: now,
    updated_at: now,
    dirty: true,
    synced_at: null,
  };

  await db.leave_requests.add(leave);
  return leave;
}

// ─── approveLeave ──────────────────────────────────────────────────────────
export async function approveLeave(leaveId: string, approverRole: 'HM' | 'PRINCIPAL', approverId: string): Promise<void> {
  const leave = await db.leave_requests.get(leaveId);
  if (!leave) throw new Error('Leave request not found');

  const dayCount = Math.ceil(
    (parseISO(leave.end_date).getTime() - parseISO(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  let newStatus: LeaveStatus;

  if (approverRole === 'HM') {
    // HM can directly approve short leaves (≤ 3 days); long/medical → forward to Principal
    const needsPrincipal = dayCount > 3 || leave.leave_type === 'MEDICAL' || leave.leave_type === 'EMERGENCY';
    newStatus = needsPrincipal ? 'PENDING_PRINCIPAL' : 'APPROVED';
  } else {
    // Principal approves anything
    newStatus = 'APPROVED';
  }

  const now = new Date().toISOString();
  await db.leave_requests.update(leaveId, {
    status: newStatus,
    approved_by: approverId,
    updated_at: now,
    dirty: true,
    synced_at: null,
  });

  // Push to Supabase immediately if online
  if (navigator.onLine) {
    await supabase.from('leave_requests').update({
      status: newStatus,
      approved_by: approverId,
      updated_at: now,
    }).eq('id', leaveId);
  }
}

// ─── rejectLeave ───────────────────────────────────────────────────────────
export async function rejectLeave(leaveId: string, rejecterId: string, reason?: string): Promise<void> {
  const now = new Date().toISOString();
  await db.leave_requests.update(leaveId, {
    status: 'REJECTED',
    approved_by: rejecterId,
    rejection_reason: reason ?? null,
    updated_at: now,
    dirty: true,
    synced_at: null,
  });

  if (navigator.onLine) {
    await supabase.from('leave_requests').update({
      status: 'REJECTED',
      approved_by: rejecterId,
      rejection_reason: reason ?? null,
      updated_at: now,
    }).eq('id', leaveId);
  }
}

// ─── getOverdueLeaves ──────────────────────────────────────────────────────
export async function getOverdueLeaves(): Promise<LeaveRequest[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.leave_requests
    .filter(r =>
      r.status === 'APPROVED' &&
      r.end_date < today &&
      r.actual_return_time === null
    )
    .toArray();
}

// ─── getTodaysLeaves ───────────────────────────────────────────────────────
export async function getTodaysLeaves(): Promise<LeaveRequest[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.leave_requests
    .filter(r =>
      r.status === 'APPROVED' &&
      r.start_date <= today &&
      r.end_date >= today &&
      r.actual_return_time === null
    )
    .toArray();
}

// ─── getPendingLeaves ──────────────────────────────────────────────────────
export async function getPendingLeaves(role: string, houseIds: string[]): Promise<LeaveRequest[]> {
  const all = await db.leave_requests
    .filter(r => r.status === 'PENDING_HM' || r.status === 'PENDING_PRINCIPAL')
    .toArray();

  if (role === 'PRINCIPAL' || role === 'ADMIN') return all;

  // HM: only their house students
  if (houseIds.length === 0) return [];
  const houseStudents = await db.students.where('house_id').anyOf(houseIds).toArray();
  const studentIds = new Set(houseStudents.map(s => s.id));
  return all.filter(r => studentIds.has(r.student_id));
}

// ─── markReturned ──────────────────────────────────────────────────────────
export async function markReturned(leaveId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.leave_requests.update(leaveId, {
    status: 'COMPLETED',
    actual_return_time: now,
    updated_at: now,
    dirty: true,
    synced_at: null,
  });

  if (navigator.onLine) {
    await supabase.from('leave_requests').update({
      status: 'COMPLETED',
      actual_return_time: now,
      updated_at: now,
    }).eq('id', leaveId);
  }
}
