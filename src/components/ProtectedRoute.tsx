import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInactivityLock } from '../hooks/useInactivityLock';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, role, isLoading } = useAuth();
  const { isLocked, pin, unlock, isInitialized } = useInactivityLock();
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Wait for auth to finish loading
  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#1a3a5c] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Role guard — check if user has permission for this specific route
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full border border-red-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You don't have permission to view this page.</p>
          <p className="text-gray-400 text-xs mt-1">Your role: <span className="font-medium text-gray-600">{role}</span></p>
        </div>
      </div>
    );
  }

  // PIN lock screen — only shown when a PIN has been SET and the session is LOCKED
  // If no PIN is set, skip the lock entirely (PIN setup is now optional, done via Settings)
  if (pin && isLocked) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="mx-auto w-14 h-14 flex items-center justify-center bg-[#1a3a5c]/10 rounded-full mb-4">
            <svg className="w-7 h-7 text-[#1a3a5c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-1 text-center text-gray-800">App Locked</h3>
          <p className="text-sm text-gray-500 mb-6 text-center">Enter your 4-digit PIN to continue.</p>
          <input
            type="password"
            maxLength={4}
            value={inputPin}
            autoFocus
            onChange={e => {
              setInputPin(e.target.value.replace(/\D/g, ''));
              if (pinError) setPinError(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputPin.length === 4) {
                const ok = unlock(inputPin);
                if (ok) { setInputPin(''); setPinError(false); }
                else { setPinError(true); }
              }
            }}
            className={`w-full text-center text-3xl tracking-[0.5em] border py-3 rounded-xl mb-2 focus:outline-none transition-colors ${
              pinError ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20'
            }`}
            placeholder="••••"
          />
          <div className="h-5 mb-4">
            {pinError && <p className="text-red-500 text-sm text-center">Incorrect PIN. Try again.</p>}
          </div>
          <button
            onClick={() => {
              const ok = unlock(inputPin);
              if (ok) { setInputPin(''); setPinError(false); }
              else { setPinError(true); }
            }}
            disabled={inputPin.length !== 4}
            className="w-full bg-[#1a3a5c] text-white py-3 rounded-xl font-semibold disabled:opacity-40 transition-all hover:bg-[#0f2440]"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // Authenticated and not locked — render children or nested routes
  return <>{children ?? <Outlet />}</>;
};
