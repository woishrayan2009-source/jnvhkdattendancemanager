import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardCheck, CalendarClock,
  Users, BarChart3, Settings, LogOut, School,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { clsx }    from 'clsx'
import type { StaffRole } from '@/types'

interface NavItem {
  to:    string
  label: string
  icon:  React.ElementType
  roles: StaffRole[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',           label: 'Dashboard',   icon: LayoutDashboard, roles: ['principal','vice_principal','house_master','associate_hm','warden','gate_guard','admin'] },
  { to: '/attendance', label: 'Attendance',  icon: ClipboardCheck,  roles: ['principal','vice_principal','house_master','associate_hm','warden'] },
  { to: '/leaves',     label: 'Leaves',      icon: CalendarClock,   roles: ['principal','vice_principal','house_master','associate_hm','gate_guard'] },
  { to: '/students',   label: 'Students',    icon: Users,           roles: ['principal','vice_principal','house_master','associate_hm','admin'] },
  { to: '/reports',    label: 'Reports',     icon: BarChart3,       roles: ['principal','vice_principal','house_master','admin'] },
  { to: '/settings',   label: 'Settings',   icon: Settings,         roles: ['principal','admin'] },
]

export function Sidebar() {
  const { user, signOut, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter((item) => hasRole(item.roles))

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-800 text-white shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-700">
          <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center shrink-0">
            <School size={20} className="text-navy-900" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">
              {import.meta.env.VITE_SCHOOL_NAME || 'JNV Hostel'}
            </p>
            <p className="text-navy-300 text-xs">Hostel Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-navy-700 text-white'
                    : 'text-navy-200 hover:bg-navy-700/60 hover:text-white',
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-navy-700 p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-sm shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-navy-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-navy-200 hover:bg-navy-700/60 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex safe-area-pb">
        {visibleItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-navy-800' : 'text-slate-400',
              )
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
