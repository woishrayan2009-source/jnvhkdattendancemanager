import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in the values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export const SCHOOL_ID = 'a1000000-0000-0000-0000-000000000001'

export const HOUSES = [
  { id: 'b1000000-0000-0000-0000-000000000001', name: 'Nilgiri',  color: '#16a34a' },
  { id: 'b1000000-0000-0000-0000-000000000002', name: 'Arawali',  color: '#2563eb' },
  { id: 'b1000000-0000-0000-0000-000000000003', name: 'Shiwalik', color: '#dc2626' },
  { id: 'b1000000-0000-0000-0000-000000000004', name: 'Udaygiri', color: '#d97706' },
]

export const SESSIONS = [
  { type: 'morning', label: 'Morning', time: '07:00', icon: '🌅' },
  { type: 'evening', label: 'Evening', time: '17:00', icon: '🌤️' },
  { type: 'night',   label: 'Night',   time: '21:00', icon: '🌙' },
]

export const LEAVE_TYPES = [
  { code: 'HL', label: 'Home Leave' },
  { code: 'ML', label: 'Medical Leave' },
  { code: 'CL', label: 'Casual Leave' },
  { code: 'SA', label: 'Sanctioned Absence' },
  { code: 'OD', label: 'On Duty' },
]

export const ROLES = {
  ADMIN:      'ADMIN',
  PRINCIPAL:  'PRINCIPAL',
  HM:         'HM',
  GATE_GUARD: 'GATE_GUARD',
}
