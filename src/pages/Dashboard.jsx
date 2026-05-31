import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ClipboardCheck, Users, Calendar, TrendingUp, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getTodaySessions } from '../services/attendance'
import { SessionBanner } from '../components/attendance/SessionBanner'
import { useCurrentSession } from '../hooks/useCurrentSession'
import { HOUSES, SESSIONS } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { currentUser, role } = useAuth()
  const toast = useToast()
  const currentSession = useCurrentSession()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'EEEE, dd MMMM yyyy')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getTodaySessions(null)
      setSessions(data)
    } catch (err) {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Group sessions by house
  const byHouse = HOUSES.reduce((acc, house) => {
    acc[house.id] = {
      house,
      sessions: sessions.filter(s => s.house_id === house.id)
    }
    return acc
  }, {})

  // Overall summary
  const totalSessions = sessions.length
  const finalizedSessions = sessions.filter(s => s.is_finalized).length
  const completionPct = totalSessions > 0 ? Math.round((finalizedSessions / totalSessions) * 100) : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#1a3a5c] to-[#0f2440] rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">{greeting()}, {currentUser?.name?.split(' ')[0]}!</p>
            <h2 className="text-2xl font-bold mt-1">JNV Haridwar</h2>
            <p className="text-white/60 text-sm mt-1">{today}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs uppercase tracking-wide">Current Session</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl">{currentSession?.icon}</span>
              <span className="text-lg font-semibold">{currentSession?.label}</span>
            </div>
            <p className="text-white/40 text-xs mt-0.5">{currentSession?.time}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>Today's sessions completed</span>
            <span>{finalizedSessions}/{totalSessions} ({completionPct}%)</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full">
            <div
              className="h-1.5 bg-[#d97706] rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Mark Attendance', icon: ClipboardCheck, to: '/mark-attendance', color: 'bg-[#1a3a5c] text-white' },
          { label: 'Record Leave',    icon: Calendar,        to: '/leave-request',   color: 'bg-amber-500 text-white' },
          { label: 'Students',        icon: Users,           to: '/students',         color: 'bg-emerald-600 text-white' },
          { label: 'Reports',         icon: TrendingUp,      to: '/reports',          color: 'bg-sky-600 text-white' },
        ].map(card => (
          <Link key={card.to} to={card.to}
            className={`${card.color} rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow`}
          >
            <card.icon size={22} />
            <span className="text-xs font-semibold text-center">{card.label}</span>
          </Link>
        ))}
      </div>

      {/* Today's session status */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[#1a3a5c]">Today's Attendance Status</h3>
        <button onClick={load} className="text-gray-400 hover:text-[#1a3a5c] transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#1a3a5c]" size={24} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(byHouse).map(({ house, sessions: houseSessions }) => (
            <div key={house.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* House header */}
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderLeft: `4px solid ${house.color}` }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: house.color }} />
                <h4 className="font-semibold text-[#1a3a5c]">{house.name} House</h4>
              </div>

              {/* Session rows */}
              <div className="divide-y divide-gray-50">
                {SESSIONS.map(session => {
                  const sessionData = houseSessions.find(s => s.session_type === session.type)
                  const isCurrent = currentSession?.type === session.type
                  return (
                    <div key={session.type} className={`flex items-center justify-between px-5 py-3 ${
                      isCurrent ? 'bg-[#1a3a5c]/5' : ''
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{session.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{session.label}</p>
                          <p className="text-xs text-gray-400">{session.time}</p>
                        </div>
                      </div>
                      <div>
                        {sessionData ? (
                          <Badge variant={sessionData.is_finalized ? 'present' : 'default'}>
                            {sessionData.is_finalized ? '✓ Done' : 'In Progress'}
                          </Badge>
                        ) : (
                          <Badge variant="default">Not Started</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
