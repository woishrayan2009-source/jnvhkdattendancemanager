import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInactivityLock } from '../hooks/useInactivityLock';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, role, isLoading } = useAuth();
  const { isLocked, pin, unlock, setupPin, isInitialized } = useInactivityLock();
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState(false);

  if (isLoading || !isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="p-8 bg-white text-gray-800 rounded-lg shadow-lg text-center max-w-sm w-full border border-red-200">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
          <h3 className="text-lg font-bold mb-2 text-center text-gray-800">Set up Security PIN</h3>
          <p className="text-sm text-gray-600 mb-6 text-center">Create a 4-digit PIN to secure the app when inactive.</p>
          <input
            type="password"
            maxLength={4}
            value={inputPin}
            onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-3xl tracking-[0.5em] border border-gray-300 py-3 rounded mb-6 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="••••"
          />
          <button
            onClick={() => {
              if (inputPin.length === 4) setupPin(inputPin);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:opacity-50 transition-colors hover:bg-blue-700"
            disabled={inputPin.length !== 4}
          >
            Save PIN
          </button>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-gray-800">App Locked</h3>
          <p className="text-sm text-gray-600 mb-6 text-center">Enter your 4-digit PIN to unlock.</p>
          <input
            type="password"
            maxLength={4}
            value={inputPin}
            onChange={e => {
              setInputPin(e.target.value.replace(/\D/g, ''));
              if (pinError) setPinError(false);
            }}
            className={`w-full text-center text-3xl tracking-[0.5em] border py-3 rounded mb-2 focus:outline-none transition-colors ${pinError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
            placeholder="••••"
          />
          <div className="h-6 mb-4">
            {pinError && <p className="text-red-500 text-sm text-center">Incorrect PIN. Try again.</p>}
          </div>
          <button
            onClick={() => {
              const success = unlock(inputPin);
              if (success) {
                setPinError(false);
                setInputPin('');
              } else {
                setPinError(true);
              }
            }}
            className="w-full bg-blue-600 text-white py-3 rounded font-medium disabled:opacity-50 transition-colors hover:bg-blue-700"
            disabled={inputPin.length !== 4}
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
