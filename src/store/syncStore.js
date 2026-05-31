import { create } from 'zustand'

export const useSyncStore = create((set, get) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  setOnline: (v) => set({ isOnline: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
  setIsSyncing: (v) => set({ isSyncing: v }),
  setLastSyncedAt: (t) => set({ lastSyncedAt: t }),
  setSyncError: (e) => set({ syncError: e }),

  incrementPending: () => set(s => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set(s => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
}))
