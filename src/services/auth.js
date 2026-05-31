import { supabase } from '../lib/supabase'

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, houses(*), schools(*)')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllUsers(schoolId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, houses(name, color)')
    .eq('school_id', schoolId)
    .order('full_name')
  if (error) throw error
  return data
}

export async function createUser({ email, password, role, full_name, school_id, house_id }) {
  // 1. Create auth user via admin API (requires service role — done via Supabase Edge Function or dashboard)
  // For client-side, we invite users via email
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error

  // 2. Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, role, full_name, email, school_id, house_id })
    .select()
    .single()
  if (profileError) throw profileError
  return profile
}

export async function updateUserRole(userId, role, house_id) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, house_id })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return data
}
