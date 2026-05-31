/**
 * AttendanceService unit tests
 *
 * Vitest + fake-indexeddb (loaded in src/test/setup.ts via `fake-indexeddb/auto`)
 * Supabase is fully mocked so tests are pure in-process.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudentsForHouse, saveAttendance, getAttendanceForDate } from './AttendanceService';
import { db } from '../db/schema';

// ─── Supabase mock ─────────────────────────────────────────────────────────
// Must fully chain: from().select().eq()  /  from().select().in().eq()
// We return empty data so Dexie is always the source of truth in these tests.
vi.mock('../lib/supabase', () => {
  const makeQuery = () => {
    const q: any = {
      select: () => q,
      eq: () => q,
      in: () => q,
      gt: () => q,
      upsert: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      // final resolution for select chains
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return q;
  };

  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
      from: () => makeQuery(),
    },
  };
});

// ─── Seed data ─────────────────────────────────────────────────────────────
const BASE_STUDENT = {
  hostel_id: 'h1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  dirty: false as const,
  synced_at: null,
};

const mockStudents = [
  { ...BASE_STUDENT, id: 'stu-1', name: 'Alice', house_id: 'house-a' },
  { ...BASE_STUDENT, id: 'stu-2', name: 'Bob',   house_id: 'house-a' },
];

beforeEach(async () => {
  await db.students.clear();
  await db.attendance_records.clear();
  await db.students.bulkPut(mockStudents);
});

// ══════════════════════════════════════════════════════════════════════════
// Test 1 — getStudentsForHouse returns cached students from Dexie
// ══════════════════════════════════════════════════════════════════════════
describe('getStudentsForHouse', () => {
  it('returns students from Dexie when cache is populated', async () => {
    const result = await getStudentsForHouse('house-a');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.name).sort()).toEqual(['Alice', 'Bob']);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────
  it('returns an empty array for an unknown house (no cache, mock Supabase empty)', async () => {
    const result = await getStudentsForHouse('house-zzz');

    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Test 3 — saveAttendance writes records to Dexie with dirty=true
// ══════════════════════════════════════════════════════════════════════════
describe('saveAttendance', () => {
  it('persists records to Dexie and flags them dirty', async () => {
    await saveAttendance([
      { student_id: 'stu-1', date: '2024-06-01', status: 'PRESENT',  recorded_by: 'staff-1' },
      { student_id: 'stu-2', date: '2024-06-01', status: 'ABSENT',   recorded_by: 'staff-1' },
    ]);

    const saved = await db.attendance_records.toArray();
    expect(saved).toHaveLength(2);
    // Every record must be dirty so SyncService picks it up
    expect(saved.every(r => r.dirty === true)).toBe(true);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────
  it('upserts idempotently — re-saving same student+date overwrites instead of duplicating', async () => {
    const base = { student_id: 'stu-1', date: '2024-06-02', recorded_by: 'staff-1' };

    await saveAttendance([{ ...base, status: 'PRESENT' }]);
    await saveAttendance([{ ...base, status: 'ABSENT'  }]);  // should overwrite

    const saved = await db.attendance_records.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe('ABSENT');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Test 5 — getAttendanceForDate returns records that were saved for a date
// ══════════════════════════════════════════════════════════════════════════
describe('getAttendanceForDate', () => {
  it('returns saved records filtered by house and date', async () => {
    await saveAttendance([
      { student_id: 'stu-1', date: '2024-07-01', status: 'ON_LEAVE', recorded_by: 'staff-1' },
    ]);

    const result = await getAttendanceForDate('house-a', '2024-07-01');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ON_LEAVE');
    expect(result[0].student_id).toBe('stu-1');
  });
});
