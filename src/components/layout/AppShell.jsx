import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { InstallBanner } from '../InstallBanner'

const PAGE_TITLES = {
  '/':                        'Dashboard',
  '/principal-dashboard':     'Principal Dashboard',
  '/hm-dashboard':            'House Dashboard',
  '/mark-attendance':         'Mark Attendance',
  '/attendance':              'Mark Attendance',
  '/leaves':                  'Leave Management',
  '/leave-request':           'New Leave Request',
  '/leave-approval':          'Leave Approvals',
  '/leave-tracker':           'Leave Tracker',
  '/students':                'Student Roster',
  '/reports':                 'Reports & Export',
  '/qr-cards':                'QR ID Cards',
  '/settings':                'Settings',
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'JNV Haridwar'

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* PWA install banner — floats above everything on mobile */}
      <InstallBanner />
    </div>
  )
}
