import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardCheck, Users,
  FileBarChart, QrCode, Settings, LogOut, BookOpen, X,
  FilePlus, CheckSquare, MapPin, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { HOUSES } from '../../lib/supabase'

const NAV_ITEMS = [
  // Role-specific dashboards (only one shows per role)
  { to: '/principal-dashboard', icon: ShieldCheck,     label: 'Dashboard',       roles: ['admin', 'principal', 'vice_principal'] },
  { to: '/hm-dashboard',        icon: LayoutDashboard, label: 'Dashboard',       roles: ['house_master', 'associate_hm', 'warden'] },
  { to: '/leave-tracker',       icon: MapPin,          label: 'Dashboard',       roles: ['gate_guard'] },
  // General nav
  { to: '/mark-attendance',     icon: ClipboardCheck,  label: 'Mark Attendance', roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden'] },
  { to: '/leave-request',       icon: FilePlus,        label: 'New Leave',       roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden'] },
  { to: '/leave-approval',      icon: CheckSquare,     label: 'Leave Approvals', roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden'] },
  { to: '/leave-tracker',       icon: MapPin,          label: 'Leave Tracker',   roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden', 'gate_guard'] },
  { to: '/students',            icon: Users,           label: 'Students',        roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden'] },
  { to: '/reports',             icon: FileBarChart,    label: 'Reports',         roles: ['admin', 'principal', 'vice_principal', 'house_master', 'associate_hm', 'warden'] },
  { to: '/qr-cards',            icon: QrCode,          label: 'QR Cards',        roles: ['admin', 'principal', 'vice_principal'] },
  { to: '/settings',            icon: Settings,        label: 'Settings',        roles: ['admin', 'principal', 'vice_principal'] },
]

export function Sidebar({ isOpen, onClose }) {
  const { currentUser, role, assignedHouseIds, logout } = useAuth()
  const navigate = useNavigate()

  const normalizedRole = role?.toLowerCase() ?? null
  const visibleItems = NAV_ITEMS.filter(item =>
    !normalizedRole || item.roles.includes(normalizedRole)
  )

  // Remove duplicate nav items (e.g. GATE_GUARD sees leave-tracker twice otherwise)
  const uniqueItems = visibleItems.filter((item, idx, arr) =>
    arr.findIndex(i => i.to === item.to && i.label === item.label) === idx
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isHM = ['house_master', 'associate_hm', 'warden'].includes(normalizedRole)
  const hmHouseInfo = isHM && assignedHouseIds.length > 0
    ? HOUSES.find(h => h.id === assignedHouseIds[0])
    : null

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-[#1a3a5c] flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#d97706] flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">JNV Haridwar</p>
              <p className="text-white/50 text-xs mt-0.5">Attendance System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Menu</p>
          {uniqueItems.map(item => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5
                text-sm font-medium transition-all duration-150
                ${
                  isActive
                    ? 'bg-white/15 text-white shadow-inner'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* House badge (for HM) */}
        {hmHouseInfo && (
          <div className="px-5 py-3 border-t border-white/10">
            <p className="text-white/40 text-xs mb-1">Assigned House</p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: hmHouseInfo.color }}
              />
              <span className="text-white text-sm font-medium">{hmHouseInfo.name}</span>
            </div>
          </div>
        )}

        {/* User info + Logout */}
        <div className="p-3 border-t border-white/10">
          {currentUser && (
            <div className="px-3 py-2 mb-1">
              <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
              <p className="text-white/40 text-xs capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
