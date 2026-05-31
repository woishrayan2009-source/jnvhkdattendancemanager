import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { StaffRole } from '@/types'
import { PageSpinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: StaffRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  if (!initialized || loading) return <PageSpinner />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
