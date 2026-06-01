import React, { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { db } from '../db/schema'
import { SyncService } from '../services/SyncService'
export type StaffRole = 'principal' | 'vice_principal' | 'house_master' | 'associate_hm' | 'warden' | 'gate_guard' | 'admin'
export type HouseId = string

export interface StaffMember {
  id:                  string
  email:               string
  full_name:           string
  role:                StaffRole
  assigned_house_ids:  string[] | null
  is_active:           boolean
  academic_year:       string
  pin_hash:            string | null
  created_at:          string
  updated_at:          string
  dirty?:              boolean
  synced_at?:          string
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AuthState {
  user:        StaffMember | null
  loading:     boolean
  initialized: boolean
  idleWarning: boolean
}

type AuthAction =
  | { type: 'SET_USER';         payload: StaffMember | null }
  | { type: 'SET_LOADING';      payload: boolean }
  | { type: 'SET_INITIALIZED' }
  | { type: 'SET_IDLE_WARNING'; payload: boolean }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':         return { ...state, user: action.payload, loading: false }
    case 'SET_LOADING':      return { ...state, loading: action.payload }
    case 'SET_INITIALIZED':  return { ...state, initialized: true }
    case 'SET_IDLE_WARNING': return { ...state, idleWarning: action.payload }
    default:                 return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:        StaffMember | null
  loading:     boolean
  initialized: boolean
  idleWarning: boolean
  // ↓ kept for backward-compat with old code that used currentUser/role/logout
  currentUser: StaffMember | null
  role:        string | null
  assignedHouseIds: string[]
  isLoading:   boolean
  signIn:      (email: string, password: string) => Promise<void>
  signOut:     () => Promise<void>
  logout:      () => Promise<void>
  hasRole:     (roles: StaffRole[]) => boolean
  canSeeHouse: (houseId: string) => boolean
  dismissIdleWarning: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const IDLE_TIMEOUT_MS =
  (Number((import.meta as any).env.VITE_IDLE_TIMEOUT_MINUTES) || 10) * 60 * 1000
// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null, loading: true, initialized: false, idleWarning: false,
  })

  const userRef   = useRef<StaffMember | null>(null)
  userRef.current = state.user
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (!userRef.current) return
    idleTimer.current = setTimeout(
      () => dispatch({ type: 'SET_IDLE_WARNING', payload: true }),
      IDLE_TIMEOUT_MS,
    )
  }

  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, resetIdleTimer))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch user from Dexie first, fallback to Supabase ───────────────────
  const fetchAndSetUser = async (userId: string): Promise<void> => {
    try {
      let staffRecord = await db.staff.get(userId) as StaffMember | undefined

      if (!staffRecord) {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', userId)
          .single()

        if (error || !data) {
          console.warn('No staff record found for user:', userId)
          dispatch({ type: 'SET_USER', payload: null })
          return
        }

        const now = new Date().toISOString()
        staffRecord = { ...data, dirty: false, synced_at: now } as StaffMember
        await db.staff.put(staffRecord)
      }

      dispatch({ type: 'SET_USER', payload: staffRecord })
      SyncService.syncAfterLogin()
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      dispatch({ type: 'SET_USER', payload: null })
    }
  }

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) await fetchAndSetUser(session.user.id)
        else dispatch({ type: 'SET_USER', payload: null })
      } catch (err) {
        console.error('Error restoring session:', err)
        dispatch({ type: 'SET_USER', payload: null })
      } finally {
        initialized.current = true
        dispatch({ type: 'SET_INITIALIZED' })
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!initialized.current) return
        if (event === 'SIGNED_IN' && session?.user) {
          dispatch({ type: 'SET_LOADING', payload: true })
          await fetchAndSetUser(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SET_USER', payload: null })
          await clearLocalData()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const clearLocalData = async () => {
    try {
      const tables = ['houses','hostels','staff','students','attendance_records','leave_requests','sync_log','audit_log']
      for (const table of tables) {
        // @ts-ignore
        await db.table(table).clear()
      }
    } catch (err) {
      console.error('Failed to clear local data:', err)
    }
  }

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw error
    }
  }

  const signOut = async () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    dispatch({ type: 'SET_USER', payload: null })
    await clearLocalData()
    await supabase.auth.signOut()
  }

  const dismissIdleWarning = () => {
    dispatch({ type: 'SET_IDLE_WARNING', payload: false })
    resetIdleTimer()
  }

  const hasRole = (roles: StaffRole[]) =>
    !!state.user && roles.includes(state.user.role)

  const canSeeHouse = (houseId: string) => {
    if (!state.user) return false
    if (state.user.assigned_house_ids === null) return true
    return state.user.assigned_house_ids.includes(houseId as HouseId)
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      // backward-compat aliases
      currentUser:      state.user,
      role:             state.user?.role ?? null,
      assignedHouseIds: state.user?.assigned_house_ids ?? [],
      isLoading:        state.loading,
      signIn,
      signOut,
      logout:           signOut,   // alias for old code
      hasRole,
      canSeeHouse,
      dismissIdleWarning,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

// backward-compat named export
export { AuthContext }