import { supabase, SCHOOL_ID } from '../lib/supabase'
import { db, upsertMany } from '../lib/dexie'

export async function fetchStudents({ houseId, classId, includeInactive = false } = {}) {
  let query = supabase
    .from('students')
    .select(`
      *,
      houses(id, name, color),
      classes(id, grade, section)
    `)
    .eq('school_id', SCHOOL_ID)
    .order('roll_number')

  if (!includeInactive) query = query.eq('is_active', true)
  if (houseId)  query = query.eq('house_id', houseId)
  if (classId)  query = query.eq('class_id', classId)

  const { data, error } = await query
  if (error) throw error

  // Cache in IndexedDB
  const toCache = data.map(s => ({ ...s, _cached_at: Date.now() }))
  await upsertMany('students', toCache)

  return data
}

export async function fetchStudentsOffline(houseId) {
  return db.students
    .where('house_id').equals(houseId)
    .and(s => s.is_active === true || s.is_active === 1)
    .sortBy('roll_number')
}

export async function getStudentByQR(qrToken) {
  // Try offline first
  const local = await db.students.where('qr_token').equals(qrToken).first()
  if (local) return local

  const { data, error } = await supabase
    .from('students')
    .select('*, houses(*), classes(*)')
    .eq('qr_token', qrToken)
    .single()
  if (error) throw error
  return data
}

export async function createStudent(studentData) {
  const { data, error } = await supabase
    .from('students')
    .insert({ ...studentData, school_id: SCHOOL_ID })
    .select('*, houses(*), classes(*)')
    .single()
  if (error) throw error
  await db.students.put({ ...data, _cached_at: Date.now() })
  return data
}

export async function updateStudent(id, updates) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select('*, houses(*), classes(*)')
    .single()
  if (error) throw error
  await db.students.put({ ...data, _cached_at: Date.now() })
  return data
}

export async function deactivateStudent(id) {
  return updateStudent(id, { is_active: false })
}

export async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', SCHOOL_ID)
    .order('grade')
    .order('section')
  if (error) throw error
  await upsertMany('classes', data)
  return data
}

// Year-end promotion: promote all active students up one grade
export async function promoteStudents(academicYear) {
  // 1. Get all active students with their current class info
  const { data: class12Students, error: err1 } = await supabase
    .from('students')
    .select('id, class_id, classes(grade, section)')
    .eq('school_id', SCHOOL_ID)
    .eq('is_active', true)

  if (err1) throw err1

  // Get all classes for mapping grade → next grade
  const { data: allClasses } = await supabase
    .from('classes')
    .select('id, grade, section')
    .eq('school_id', SCHOOL_ID)

  const classMap = {}
  allClasses.forEach(c => {
    if (!classMap[c.grade]) classMap[c.grade] = {}
    classMap[c.grade][c.section] = c.id
  })

  const updates = []
  const alumniIds = []

  for (const student of class12Students) {
    const grade = student.classes?.grade
    const section = student.classes?.section
    if (!grade || !section) continue

    if (grade === 12) {
      alumniIds.push(student.id)
    } else {
      const nextGrade = grade + 1
      // For class 10→11, default section to 'Science' (admin can change)
      let nextSection = section
      if (grade === 10) nextSection = 'Science'
      const nextClassId = classMap[nextGrade]?.[nextSection]
      if (nextClassId) {
        updates.push({ id: student.id, class_id: nextClassId })
      }
    }
  }

  // Batch update promotions
  const promotionPromises = updates.map(u =>
    supabase.from('students').update({ class_id: u.class_id }).eq('id', u.id)
  )
  // Mark class-12 as alumni
  if (alumniIds.length > 0) {
    promotionPromises.push(
      supabase.from('students')
        .update({ is_active: false, is_alumni: true, alumni_year: academicYear })
        .in('id', alumniIds)
    )
  }

  await Promise.all(promotionPromises)

  return {
    promoted: updates.length,
    alumni: alumniIds.length,
  }
}
