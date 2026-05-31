import { supabase, SCHOOL_ID } from '../lib/supabase'
import { db, findSession, getRecordsForSession, enqueueSync } from '../lib/dexie'
import { format } from 'date-fns'

export async function openSession(houseId, sessionType, openedBy) {
  const sessionDate = format(new Date(), 'yyyy-MM-dd')

  // Check if session already exists
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('house_id', houseId)
    .eq('session_date', sessionDate)
    .eq('session_type', sessionType)
    .single()

  if (existing) return existing

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({
      school_id: SCHOOL_ID,
      house_id: houseId,
      session_date: sessionDate,
      session_type: sessionType,
      opened_by: openedBy,
    })
    .select()
    .single()

  if (error) throw error

  // Cache locally
  await db.attendance_sessions.put({ ...data, synced: true })
  return data
}

export async function getOrCreateSession(houseId, sessionType, openedBy) {
  const sessionDate = format(new Date(), 'yyyy-MM-dd')

  // Try offline first
  const local = await findSession(houseId, sessionDate, sessionType)
  if (local && navigator.onLine === false) return local

  return openSession(houseId, sessionType, openedBy)
}

export async function getSessionRecords(sessionId) {
  // Try offline first
  const local = await getRecordsForSession(sessionId)
  if (local.length > 0 && !navigator.onLine) return local

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)

  if (error) throw error

  // Cache locally
  const toCache = data.map(r => ({ ...r, synced: true }))
  await db.attendance_records.bulkPut(toCache)

  return data
}

export async function saveAttendance(sessionId, records, markedBy) {
  // records: [{ student_id, status, leave_type, remarks }]
  const timestamp = new Date().toISOString()

  const payload = records.map(r => ({
    session_id: sessionId,
    student_id: r.student_id,
    status: r.status,
    leave_type: r.status === 'leave' ? r.leave_type : null,
    remarks: r.remarks || null,
    marked_by: markedBy,
    marked_at: timestamp,
    is_offline_sync: !navigator.onLine,
  }))

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(payload, { onConflict: 'session_id,student_id' })
      .select()
    if (error) throw error

    // Cache
    await db.attendance_records.bulkPut(data.map(r => ({ ...r, synced: true })))
    return data
  } else {
    // Save offline
    const localRecords = payload.map(r => ({ ...r, synced: false }))
    await db.attendance_records.bulkPut(localRecords)
    await enqueueSync('save_attendance', { sessionId, records: payload, markedBy })
    return localRecords
  }
}

export async function submitSession(sessionId, submittedBy) {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .update({
      is_finalized: true,
      submitted_at: new Date().toISOString(),
      submitted_by: submittedBy,
    })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  await db.attendance_sessions.put({ ...data, synced: true })
  return data
}

export async function amendRecord(recordId, updates, amendedBy, reason) {
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      ...updates,
      amended_by: amendedBy,
      amended_at: new Date().toISOString(),
      amendment_reason: reason,
    })
    .eq('id', recordId)
    .select()
    .single()
  if (error) throw error

  // Increment amendment count on session
  const record = data
  await supabase
    .from('attendance_sessions')
    .update({ amendment_count: supabase.rpc('increment', { row_id: record.session_id }) })
    .eq('id', record.session_id)

  return data
}

export async function getTodaySessions(houseId = null) {
  const today = format(new Date(), 'yyyy-MM-dd')
  let query = supabase
    .from('attendance_sessions')
    .select(`
      *,
      houses(name, color),
      profiles!attendance_sessions_opened_by_fkey(full_name)
    `)
    .eq('school_id', SCHOOL_ID)
    .eq('session_date', today)

  if (houseId) query = query.eq('house_id', houseId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAttendanceReport({ houseId, classId, fromDate, toDate, sessionType }) {
  let query = supabase
    .from('attendance_records')
    .select(`
      *,
      students(id, name, roll_number, house_id, class_id, houses(name), classes(grade, section)),
      attendance_sessions!inner(session_date, session_type, house_id, is_finalized)
    `)
    .eq('attendance_sessions.school_id', SCHOOL_ID)
    .gte('attendance_sessions.session_date', fromDate)
    .lte('attendance_sessions.session_date', toDate)

  if (sessionType) query = query.eq('attendance_sessions.session_type', sessionType)
  if (houseId) query = query.eq('attendance_sessions.house_id', houseId)

  const { data, error } = await query
  if (error) throw error
  return data
}
