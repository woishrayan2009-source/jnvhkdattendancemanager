/**
 * Dexie (IndexedDB) schema — Phase 1 stub.
 * Mirrors the Supabase tables but adds `is_dirty` + `synced_at` for offline sync.
 * Full implementation in Phase 3.
 */
import Dexie, { type Table } from 'dexie'
import type {
  Student,
  AttendanceRecord,
  LeaveRequest,
  StaffMember,
  SyncQueueItem,
  AuditLogEntry,
} from '@/types'

export class JNVDatabase extends Dexie {
  students!:         Table<Student>
  attendance!:       Table<AttendanceRecord>
  leave_requests!:   Table<LeaveRequest>
  staff!:            Table<StaffMember>
  // Fix: SyncQueueItem.id is typed string in types/index.ts but Dexie '++id'
  // auto-increment produces numbers. Override the key type to number here.
  sync_queue!:       Table<Omit<SyncQueueItem, 'id'> & { id?: number }>
  audit_log!:        Table<Omit<AuditLogEntry, 'id'> & { id?: number }>

  constructor() {
    super('jnv-hostel-db')

    this.version(1).stores({
      // Primary key first, then indexed fields
      students:       'id, admission_no, house_id, hostel_id, class_no, is_active, academic_year',
      attendance:     'id, student_id, date, session, status, is_dirty, synced_at',
      leave_requests: 'id, student_id, from_date, to_date, status, is_overdue',
      staff:          'id, email, role',
      sync_queue:     '++id, table_name, record_id, operation, created_at',
      audit_log:      '++id, table_name, record_id, performed_by, timestamp',
    })
  }
}

export const db = new JNVDatabase()
