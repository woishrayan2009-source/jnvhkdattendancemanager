import React from 'react'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { SESSIONS } from '../../lib/supabase'
import { Badge } from '../ui/Badge'
import { format } from 'date-fns'

export function SessionBanner({ currentSession, activeSessions = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {SESSIONS.map(session => {
        const active = activeSessions.find(s => s.session_type === session.type)
        const isCurrent = currentSession?.type === session.type

        return (
          <div
            key={session.type}
            className={`
              relative rounded-xl p-4 border-2 transition-all
              ${isCurrent
                ? 'border-[#1a3a5c] bg-[#1a3a5c] text-white shadow-lg'
                : 'border-gray-200 bg-white text-gray-700'
              }
            `}
          >
            {isCurrent && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d97706] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d97706]" />
              </span>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{session.icon}</span>
              <div>
                <p className={`font-semibold text-sm ${isCurrent ? 'text-white' : 'text-[#1a3a5c]'}`}>
                  {session.label}
                </p>
                <p className={`text-xs ${isCurrent ? 'text-white/70' : 'text-gray-400'}`}>
                  {session.time}
                </p>
              </div>
            </div>

            {active ? (
              <div className="flex items-center gap-1.5">
                {active.is_finalized
                  ? <CheckCircle2 size={14} className={isCurrent ? 'text-emerald-300' : 'text-emerald-500'} />
                  : <Clock size={14} className={isCurrent ? 'text-amber-300' : 'text-amber-500'} />
                }
                <span className={`text-xs ${isCurrent ? 'text-white/80' : 'text-gray-600'}`}>
                  {active.is_finalized ? 'Submitted' : 'In Progress'}
                </span>
              </div>
            ) : (
              <span className={`text-xs ${isCurrent ? 'text-white/60' : 'text-gray-400'}`}>Not started</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
