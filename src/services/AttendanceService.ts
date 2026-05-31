import { db, Student, AttendanceRecord } from '../db/schema';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE';

export interface AttendanceInput {
  student_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by: string;
}

// ─── Get all students for a given house (Dexie-first) ─────────────────────
export async function getStudentsForHouse(houseId: string): Promise<Student[]> {
  const local = await db.students
    .where('house_id')
    .equals(houseId)
    .toArray();

  if (local.length > 0) return local;

  // Fallback to Supabase when no local cache
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('house_id', houseId);

  if (error) throw error;

  const now = new Date().toISOString();
  const toCache = (data ?? []).map((s) => ({
    ...s,
    dirty: false,
    synced_at: now,
  }));
  await db.students.bulkPut(toCache);

  return toCache;
}

// ─── Save attendance records (always writes to Dexie; dirty=true) ──────────
export async function saveAttendance(records: AttendanceInput[]): Promise<void> {
  const now = new Date().toISOString();

  const dexieRecords: AttendanceRecord[] = records.map((r) => ({
    id: `${r.student_id}_${r.date}`, // deterministic id used as upsert key
    student_id: r.student_id,
    date: r.date,
    status: r.status,
    recorded_by: r.recorded_by,
    created_at: now,
    updated_at: now,
    dirty: true,
    synced_at: null,
  }));

  await db.attendance_records.bulkPut(dexieRecords);
}

// ─── Get attendance for a specific date (Dexie-first) ─────────────────────
export async function getAttendanceForDate(
  houseId: string,
  date: string
): Promise<AttendanceRecord[]> {
  // Get student ids for this house
  const students = await db.students.where('house_id').equals(houseId).toArray();
  const studentIds = students.map((s) => s.id);

  if (studentIds.length === 0) return [];

  // Pull local records matching those students on this date
  const local = await db.attendance_records
    .where('date')
    .equals(date)
    .filter((r) => studentIds.includes(r.student_id))
    .toArray();

  if (local.length > 0) return local;

  // Fallback: fetch from Supabase
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .in('student_id', studentIds)
    .eq('date', date);

  if (error) throw error;

  const now = new Date().toISOString();
  const toCache = (data ?? []).map((r) => ({
    ...r,
    dirty: false,
    synced_at: now,
  }));

  if (toCache.length > 0) await db.attendance_records.bulkPut(toCache);

  return toCache;
}

// ─── Create an unlock override record (Principal only) ────────────────────
export async function createUnlockOverride(
  houseId: string,
  date: string,
  requestedBy: string
): Promise<void> {
  const now = new Date().toISOString();

  await db.audit_log.add({
    id: crypto.randomUUID(),
    action: 'UNLOCK_DATE',
    table_name: 'attendance_records',
    record_id: null,
    performed_by: requestedBy,
    details: { house_id: houseId, date, reason: 'Principal override' },
    created_at: now,
    updated_at: now,
    dirty: true,
    synced_at: null,
  });

  // If online, also push directly to Supabase
  if (navigator.onLine) {
    await supabase.from('audit_log').insert({
      action: 'UNLOCK_DATE',
      table_name: 'attendance_records',
      performed_by: requestedBy,
      details: { house_id: houseId, date },
    });
  }
}
