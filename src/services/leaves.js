import { supabase, SCHOOL_ID } from '../lib/supabase'
import { db, enqueueSync } from '../lib/dexie'

export async function recordLeave(leaveData) {
  const payload = { ...leaveData, school_id: SCHOOL_ID }

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('leaves')
      .insert(payload)
      .select(`
        *,
        students(name, roll_number, houses(name))
      `)
      .single()
    if (error) throw error
    await db.leaves.put({ ...data, synced: true })
    return data
  } else {
    const local = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString(), synced: false }
    await db.leaves.put(local)
    await enqueueSync('record_leave', payload)
    return local
  }
}

export async function getLeaves({ studentId, fromDate, toDate } = {}) {
  let query = supabase
    .from('leaves')
    .select(`
      *,
      students(id, name, roll_number, houses(name, color), classes(grade, section)),
      profiles!leaves_recorded_by_fkey(full_name)
    `)
    .eq('school_id', SCHOOL_ID)
    .order('from_date', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)
  if (fromDate)  query = query.gte('from_date', fromDate)
  if (toDate)    query = query.lte('to_date', toDate)

  const { data, error } = await query
  if (error) {
    // Fallback to offline
    if (studentId) {
      return db.leaves.where('student_id').equals(studentId).toArray()
    }
    return db.leaves.toArray()
  }

  // Cache
  await db.leaves.bulkPut(data.map(l => ({ ...l, synced: true })))
  return data
}

export async function deleteLeave(id) {
  const { error } = await supabase.from('leaves').delete().eq('id', id)
  if (error) throw error
  await db.leaves.where('id').equals(id).delete()
}

export async function getStudentLeaveBalance(studentId, academicYear) {
  const from = `${academicYear}-04-01`
  const to   = `${academicYear + 1}-03-31`

  const leaves = await getLeaves({ studentId, fromDate: from, toDate: to })

  const balance = { HL: 0, ML: 0, CL: 0, SA: 0, OD: 0 }
  leaves.forEach(l => {
    const days = Math.round((new Date(l.to_date) - new Date(l.from_date)) / 86400000) + 1
    if (balance[l.leave_type] !== undefined) balance[l.leave_type] += days
  })
  return balance
}
