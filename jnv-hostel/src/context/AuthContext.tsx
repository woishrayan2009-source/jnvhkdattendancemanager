import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { StaffMember, StaffRole, HouseId } from '@/types'

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
  signIn:      (email: string, password: string) => Promise<void>
  signOut:     () => Promise<void>
  hasRole:     (roles: StaffRole[]) => boolean
  canSeeHouse: (houseId: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const IDLE_TIMEOUT_MS =
  (Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 10) * 60 * 1000

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null, loading: true, initialized: false, idleWarning: false,
  })
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Idle timer reset
  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (!state.user) return
    idleTimer.current = setTimeout(
      () => dispatch({ type: 'SET_IDLE_WARNING', payload: true }),
      IDLE_TIMEOUT_MS,
    )
  }

  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, resetIdleTimer))
  })

  // Supabase session listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user: { id: string } } | null) => {
        if (session?.user) {
          const { data } = await supabase
            .from('staff')
            .select('*')
            .eq('id', session.user.id)
            .single()
          dispatch({ type: 'SET_USER', payload: (data as StaffMember) ?? null })
        } else {
          dispatch({ type: 'SET_USER', payload: null })
        }
        dispatch({ type: 'SET_INITIALIZED' })
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw error
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
  }

  const hasRole = (roles: StaffRole[]) =>
    !!state.user && roles.includes(state.user.role)

  const canSeeHouse = (houseId: string) => {
    if (!state.user) return false
    if (state.user.assigned_house_ids === null) return true // principal / admin
    return state.user.assigned_house_ids.includes(houseId as HouseId)
  }

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, hasRole, canSeeHouse }}
    >
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
