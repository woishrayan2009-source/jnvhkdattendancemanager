import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { db, Staff } from '../db/schema';

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetUser(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchAndSetUser(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        await clearLocalData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSetUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('staff').select('*').eq('id', userId).single();
      if (!error && data) {
        setCurrentUser(data as Staff);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalData = async () => {
    const tables = ['houses', 'hostels', 'staff', 'students', 'attendance_records', 'leave_requests', 'sync_log', 'audit_log'];
    for (const table of tables) {
      // @ts-ignore
      await db.table(table).clear();
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    await clearLocalData();
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      role: currentUser?.role || null, 
      assignedHouseIds: currentUser?.assigned_house_ids || [], 
      isLoading, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
