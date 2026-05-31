import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { AuthProvider } from './context/AuthContext'
import { PageLoader } from './components/ui/Spinner'
import { useAuth } from './hooks/useAuth'

const Login              = lazy(() => import('./pages/Login'))
const PrincipalDashboard = lazy(() => import('./pages/PrincipalDashboard'))
const HMDashboard        = lazy(() => import('./pages/HMDashboard'))
const MarkAttendance     = lazy(() => import('./pages/MarkAttendance'))
const Leaves             = lazy(() => import('./pages/Leaves'))
const Students           = lazy(() => import('./pages/Students'))
const Reports            = lazy(() => import('./pages/Reports.tsx'))
const QRCards            = lazy(() => import('./pages/QRCards'))
const Settings           = lazy(() => import('./pages/Settings'))
const LeaveRequest       = lazy(() => import('./pages/LeaveRequest'))
const LeaveApproval      = lazy(() => import('./pages/LeaveApproval'))
const LeaveTracker       = lazy(() => import('./pages/LeaveTracker'))

/**
 * Role-aware redirect for the root "/" path.
 * Each role goes to their dedicated dashboard automatically.
 */
function RootRedirect() {
  const { role, isLoading } = useAuth()
  if (isLoading) return <PageLoader message="Loading…" />
  if (role === 'PRINCIPAL' || role === 'ADMIN') return <Navigate to="/principal-dashboard" replace />
  if (role === 'HM')         return <Navigate to="/hm-dashboard" replace />
  if (role === 'GATE_GUARD') return <Navigate to="/leave-tracker" replace />
  // Fallback for any unexpected/unknown role — send to login
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader message="Loading page…" />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — all authenticated users */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                {/* Role-based root redirect */}
                <Route index element={<RootRedirect />} />

                {/* Role-specific dashboards */}
                <Route
                  path="principal-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>
                      <PrincipalDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hm-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['HM']}>
                      <HMDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Attendance */}
                <Route
                  path="mark-attendance"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM']}>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* Leave management */}
                <Route
                  path="leaves"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM', 'GATE_GUARD']}>
                      <Leaves />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-request"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM']}>
                      <LeaveRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-approval"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM']}>
                      <LeaveApproval />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-tracker"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM', 'GATE_GUARD']}>
                      <LeaveTracker />
                    </ProtectedRoute>
                  }
                />

                {/* Students */}
                <Route
                  path="students"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM']}>
                      <Students />
                    </ProtectedRoute>
                  }
                />

                {/* Reports */}
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'HM']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* Admin-only */}
                <Route
                  path="qr-cards"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>
                      <QRCards />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
