import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      loading: true,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      initialize: async () => {
        set({ loading: true })
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          set({ session, user: session.user })
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ profile, loading: false })
        } else {
          set({ session: null, user: null, profile: null, loading: false })
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            set({ session, user: session.user })
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            set({ profile })
          } else if (event === 'SIGNED_OUT') {
            set({ session: null, user: null, profile: null })
          }
        })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, session: null })
      },

      // Role helpers
      isSuperAdmin: () => get().profile?.role === 'super_admin',
      isPrincipal:  () => get().profile?.role === 'principal',
      isHouseMaster: () => get().profile?.role === 'house_master',
      isAdmin: () => ['super_admin', 'principal'].includes(get().profile?.role),
      canMarkAttendance: () =>
        ['super_admin', 'principal', 'house_master'].includes(get().profile?.role),
    }),
    {
      name: 'jnv-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
)
