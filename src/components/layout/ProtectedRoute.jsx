import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/Spinner'

/**
 * Legacy ProtectedRoute kept for backward compatibility.
 * The main ProtectedRoute (with inactivity lock) is at src/components/ProtectedRoute.tsx
 * This simplified version is used only by old JSX pages if needed.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, role, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader message="Authenticating…" />

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <div className="text-6xl">🚫</div>
        <h2 className="text-xl font-semibold text-[#1a3a5c]">Access Denied</h2>
        <p className="text-gray-500 text-center">You don't have permission to view this page.</p>
      </div>
    )
  }

  return <>{children}</>
}
