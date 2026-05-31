import Dexie, { Table } from 'dexie';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  dirty: boolean;
  synced_at: string | null;
}

export type LeaveStatus =
  | 'PENDING_HM'
  | 'PENDING_PRINCIPAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type LeaveType =
  | 'LOCAL_LEAVE'
  | 'HOME_LEAVE'
  | 'MEDICAL'
  | 'EMERGENCY'
  | 'OFFICIAL_DUTY';

export type PickupMode = 'GUARDIAN' | 'RELATIVE' | 'ESCORT';

export interface House extends BaseEntity { name: string; }
export interface Hostel extends BaseEntity { name: string; }
export interface Staff extends BaseEntity {
  name: string;
  role: 'ADMIN' | 'PRINCIPAL' | 'HM' | 'GATE_GUARD';
  assigned_house_ids: string[];
}
export interface Student extends BaseEntity {
  name: string;
  house_id: string | null;
  hostel_id: string | null;
}
export interface AttendanceRecord extends BaseEntity {
  student_id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE';
  recorded_by: string | null;
}

export interface LeaveRequest extends BaseEntity {
  student_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  departure_time: string;      // e.g. "14:00"
  return_time: string;         // expected return time e.g. "18:00"
  reason: string;
  status: LeaveStatus;
  // Guardian
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  pickup_mode: PickupMode;
  alt_emergency_contact: string;
  // Approval chain
  submitted_by: string;        // staff.id
  approved_by: string | null;
  rejection_reason: string | null;
  // Return tracking
  actual_return_time: string | null;
}

export interface SyncLog extends BaseEntity { table_name: string; last_sync_at: string; status: string; }
export interface AuditLog extends BaseEntity { action: string; table_name: string; record_id: string | null; performed_by: string | null; details: any; }
export interface AppSetting { key: string; value: string; }

export class AppDatabase extends Dexie {
  houses!: Table<House, string>;
  hostels!: Table<Hostel, string>;
  staff!: Table<Staff, string>;
  students!: Table<Student, string>;
  attendance_records!: Table<AttendanceRecord, string>;
  leave_requests!: Table<LeaveRequest, string>;
  sync_log!: Table<SyncLog, string>;
  audit_log!: Table<AuditLog, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('JnvAttendanceDb');

    // v2 — original schema (do not modify)
    this.version(2).stores({
      houses: 'id, updated_at, dirty',
      hostels: 'id, updated_at, dirty',
      staff: 'id, role, updated_at, dirty',
      students: 'id, house_id, hostel_id, updated_at, dirty',
      attendance_records: 'id, student_id, date, status, recorded_by, updated_at, dirty',
      leave_requests: 'id, student_id, start_date, status, approved_by, updated_at, dirty',
      sync_log: 'id, table_name, updated_at, dirty',
      audit_log: 'id, action, table_name, updated_at, dirty',
      settings: 'key',
    });

    // v3 — enriched leave_requests with guardian, timing, and status fields
    this.version(3).stores({
      leave_requests:
        'id, student_id, leave_type, start_date, end_date, status, submitted_by, approved_by, actual_return_time, updated_at, dirty',
    });
  }
}

export const db = new AppDatabase();

