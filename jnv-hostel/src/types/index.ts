// ─── Core domain types ────────────────────────────────────────────────────────

import type { HouseId, HostelId } from '@/constants/houses'
import type { AttendanceStatus, SessionId } from '@/constants/sessions'

// Re-export for convenience
export type { HouseId, HostelId, AttendanceStatus, SessionId }

export type DmlOperation = 'insert' | 'update' | 'delete'

// ─── House & Hostel ───────────────────────────────────────────────────────────

export interface House {
  id:         string
  name:       string
  color_hex:  string
  created_at: string
  updated_at: string
}

export interface Hostel {
  id:          string
  name:        string
  section:     string        // 'sub_junior' | 'girls' | 'junior' | 'senior'
  house_ids:   string[]
  class_range: string        // '[7,9]' stored as text client-side
  gender:      'male' | 'female'
  capacity:    number
  created_at:  string
  updated_at:  string
}

// ─── Staff & Auth ─────────────────────────────────────────────────────────────

export type StaffRole =
  | 'principal'
  | 'vice_principal'
  | 'house_master'
  | 'associate_hm'
  | 'warden'
  | 'gate_guard'
  | 'admin'

export interface StaffMember {
  id: string              // = supabase auth user_id
  email: string
  full_name: string
  role: StaffRole
  /** Houses this staff member oversees (null = all houses for principal/admin) */
  assigned_house_ids: HouseId[] | null
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Student ──────────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female'

export interface Student {
  id: string
  admission_no: string
  roll_no: string
  full_name: string
  class_no: number            // 6–12
  section: string             // 'A'|'B'|'Science'|'Commerce'
  house_id: HouseId
  hostel_id: HostelId
  gender: Gender
  room_no?: string
  bed_no?: string
  father_name: string
  mother_name: string
  guardian_phone: string
  guardian_phone2?: string
  blood_group?: string
  medical_notes?: string
  is_active: boolean
  academic_year: string       // '2025-26'
  created_at: string
  updated_at: string
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  student_id: string
  date: string                // ISO date 'YYYY-MM-DD'
  session: SessionId
  status: AttendanceStatus
  remarks?: string
  marked_by: string           // staff_id
  marked_at: string           // ISO datetime
  is_finalized: boolean
  /** Sync fields */
  synced_at?: string
  is_dirty: boolean
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export type LeaveType =
  | 'home_leave'       // HL
  | 'medical_leave'    // ML
  | 'casual_leave'     // CL
  | 'official_duty'    // OD

export type LeaveStatus =
  | 'pending'
  | 'approved_hm'
  | 'approved_principal'
  | 'rejected'
  | 'cancelled'

export interface LeaveRequest {
  id: string
  student_id: string
  leave_type: LeaveType
  from_date: string            // ISO date
  to_date: string              // ISO date
  expected_return: string      // ISO date (may differ from to_date)
  reason: string
  guardian_contact: string
  status: LeaveStatus
  applied_by: string           // staff_id
  reviewed_by?: string         // staff_id
  review_remarks?: string
  returned_at?: string         // ISO datetime — set when student checks back in
  is_overdue: boolean          // auto-set if return date passed & no returned_at
  created_at: string
  updated_at: string
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncQueueItem {
  id: string
  table_name: string
  record_id: string
  operation: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  role_at_write: StaffRole    // for conflict resolution
  created_at: string
  retry_count: number
  last_error?: string
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  operation: 'insert' | 'update' | 'delete'
  before_value?: Record<string, unknown>
  after_value: Record<string, unknown>
  performed_by: string        // staff_id
  device_id: string
  timestamp: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface PageMeta {
  title: string
  description?: string
}
