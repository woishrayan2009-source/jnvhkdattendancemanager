import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { db, Staff } from '../db/schema';
import { SyncService } from '../services/SyncService';


interface AuthContextType {
  currentUser: Staff | null;
  role: string | null;
  assignedHouseIds: string[];
  isLoading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track if we already ran the initial session check so the auth state
  // change listener doesn't double-fire on first load.
  const initialized = useRef(false);

  const fetchAndSetUser = async (userId: string): Promise<void> => {
    try {
      // Try local Dexie first (fast, offline-capable)
      let staffRecord = await db.staff.get(userId);

      if (!staffRecord) {
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !data) {
          // User is authenticated but has no staff record — clear auth
          console.warn('No staff record found for user:', userId);
          setCurrentUser(null);
          return;
        }

        // Cache locally
        const now = new Date().toISOString();
        staffRecord = { ...data, dirty: false, synced_at: now } as Staff;
        await db.staff.put(staffRecord);
      }

      setCurrentUser(staffRecord);
      // Kick off a background data sync after successful login
      SyncService.syncAfterLogin();
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    // Step 1: Check existing session on mount
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetUser(session.user.id);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        initialized.current = true;
        setIsLoading(false);
      }
    };

    initAuth();

    // Step 2: Listen for future auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the INITIAL_SESSION event — we handle that in initAuth above
      // to avoid double-fetching on first load
      if (!initialized.current) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true);
        await fetchAndSetUser(session.user.id);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        await clearLocalData();
      }
      // TOKEN_REFRESHED — do nothing, no need to re-fetch user profile
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearLocalData = async () => {
    try {
      const tables = ['houses', 'hostels', 'staff', 'students', 'attendance_records', 'leave_requests', 'sync_log', 'audit_log'];
      for (const table of tables) {
        // @ts-ignore
        await db.table(table).clear();
      }
    } catch (err) {
      console.error('Failed to clear local data:', err);
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    await clearLocalData();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      role: currentUser?.role ?? null,
      assignedHouseIds: currentUser?.assigned_house_ids ?? [],
      isLoading,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
