import Dexie from 'dexie'

export const db = new Dexie('jnv_hkd_attendance')

db.version(1).stores({
  // Students cache from Supabase
  students: '++_lid, id, school_id, [school_id+house_id], [school_id+class_id], roll_number, qr_token, is_active, name',

  // Houses & Classes lookup
  houses:  '++_lid, id, school_id',
  classes: '++_lid, id, school_id, grade',

  // Attendance sessions cache
  attendance_sessions: '++_lid, id, [house_id+session_date+session_type], session_date, house_id, is_finalized, synced',

  // Attendance records
  attendance_records: '++_lid, id, session_id, student_id, status, synced, marked_at',

  // Leaves cache
  leaves: '++_lid, id, student_id, from_date, to_date, synced',

  // Offline sync queue
  sync_queue: '++id, operation, created_at, retries, synced',
})

// Helper: Upsert a list of records into a Dexie table by their `id` field
export async function upsertMany(table, records) {
  if (!records || records.length === 0) return
  await db[table].bulkPut(records)
}

// Helper: Get all students for a house, sorted by roll_number
export async function getStudentsByHouse(houseId) {
  return db.students
    .where('house_id').equals(houseId)
    .and(s => s.is_active === true || s.is_active === 1)
    .sortBy('roll_number')
}

// Helper: Get all students for a session (by session's house_id)
export async function getStudentsForSession(session) {
  return getStudentsByHouse(session.house_id)
}

// Helper: Get records for a session
export async function getRecordsForSession(sessionId) {
  return db.attendance_records.where('session_id').equals(sessionId).toArray()
}

// Helper: Find session
export async function findSession(houseId, sessionDate, sessionType) {
  return db.attendance_sessions
    .where('[house_id+session_date+session_type]')
    .equals([houseId, sessionDate, sessionType])
    .first()
}

// Helper: Enqueue an offline operation
export async function enqueueSync(operation, payload) {
  await db.sync_queue.add({
    operation,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
    synced: false,
  })
}

// Helper: Get all unsynced queue items
export async function getPendingSyncItems() {
  return db.sync_queue.where('synced').equals(0).toArray()
}
