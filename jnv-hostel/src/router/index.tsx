import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute }  from '@/components/auth/ProtectedRoute'
import { AppShell }        from '@/components/layout/AppShell'

// Lazy loaded pages
import { lazy, Suspense } from 'react'
import { PageSpinner }    from '@/components/ui/Spinner'

const Login             = lazy(() => import('@/pages/Login'))
const Home              = lazy(() => import('@/pages/Home'))
const Attendance        = lazy(() => import('@/pages/Attendance'))
const Leaves            = lazy(() => import('@/pages/Leaves'))
const Students          = lazy(() => import('@/pages/Students'))
const Reports           = lazy(() => import('@/pages/Reports'))
const Settings          = lazy(() => import('@/pages/Settings'))
const Unauthorized      = lazy(() => import('@/pages/Unauthorized'))

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected — all authenticated users */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route
                path="attendance"
                element={
                  <ProtectedRoute allowedRoles={['principal','vice_principal','house_master','associate_hm','warden']}>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="leaves"
                element={
                  <ProtectedRoute allowedRoles={['principal','vice_principal','house_master','associate_hm','gate_guard']}>
                    <Leaves />
                  </ProtectedRoute>
                }
              />
              <Route
                path="students"
                element={
                  <ProtectedRoute allowedRoles={['principal','vice_principal','house_master','associate_hm','admin']}>
                    <Students />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['principal','vice_principal','house_master','admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['principal','admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
