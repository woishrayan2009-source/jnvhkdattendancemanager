import { supabase } from '@/lib/supabase'
import type { Student } from '@/types'

export async function getStudents(activeOnly = true): Promise<Student[]> {
  const query = supabase.from('students').select('*').order('full_name', { ascending: true })
  if (activeOnly) query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
