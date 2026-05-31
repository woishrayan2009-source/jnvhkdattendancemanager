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
  if (role === 'principal' || role === 'admin' || role === 'vice_principal')
    return <Navigate to="/principal-dashboard" replace />
  if (role === 'house_master' || role === 'associate_hm' || role === 'warden')
    return <Navigate to="/hm-dashboard" replace />
  if (role === 'gate_guard')
    return <Navigate to="/leave-tracker" replace />
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
                    <ProtectedRoute allowedRoles={['admin', 'vice_principal' , 'principal']}>
                      <PrincipalDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hm-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['house_master', 'associate_hm', 'warden']}>
                      <HMDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Attendance */}
                <Route
                  path="mark-attendance"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden']}>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* Leave management */}
                <Route
                  path="leaves"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden', 'gate_guard']}>
                      <Leaves />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-request"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden']}>
                      <LeaveRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-approval"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden']}>
                      <LeaveApproval />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leave-tracker"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden', 'gate_guard']}>
                      <LeaveTracker />
                    </ProtectedRoute>
                  }
                />

                {/* Students */}
                <Route
                  path="students"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden']}>
                      <Students />
                    </ProtectedRoute>
                  }
                />

                {/* Reports */}
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* Admin-only */}
                <Route
                  path="qr-cards"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal']}>
                      <QRCards />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'principal', 'vice_principal']}>
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
