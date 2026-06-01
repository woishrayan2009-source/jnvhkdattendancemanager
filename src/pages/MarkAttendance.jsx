import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentSession } from '../hooks/useCurrentSession'
import { SessionBanner } from '../components/attendance/SessionBanner'
import { RollCallList } from '../components/attendance/RollCallList'
import { QRScanner } from '../components/attendance/QRScanner'
import { getTodaySessions, getOrCreateSession } from '../services/attendance'
import { HOUSES, SESSIONS } from '../lib/supabase'
import { Camera } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'

export default function MarkAttendance() {
  const { currentUser, role, assignedHouseIds } = useAuth()
  const currentSession = useCurrentSession()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [selectedHouse, setSelectedHouse]     = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [todaySessions, setTodaySessions]     = useState([])
  const [activeSession, setActiveSession]     = useState(null)
  const [showQR, setShowQR]                   = useState(false)
  const [loading, setLoading]                 = useState(false)

  // Pre-select house for HM
  useEffect(() => {
    if (role === 'HM' && assignedHouseIds.length > 0) {
      setSelectedHouse(assignedHouseIds[0])
    }
    // Prefer URL param (?session=morning), else fall back to current time-based session
    const paramSession = searchParams.get('session')
    if (paramSession && ['morning','evening','night'].includes(paramSession)) {
      setSelectedSession(paramSession)
    } else if (currentSession) {
      setSelectedSession(currentSession.type)
    }
  }, [role, assignedHouseIds, currentSession, searchParams])

  useEffect(() => {
    if (!selectedHouse) return
    getTodaySessions(selectedHouse).then(setTodaySessions)
  }, [selectedHouse])

  const handleOpenSession = async () => {
    if (!selectedHouse || !selectedSession) {
      toast.error('Please select house and session')
      return
    }
    if (!currentUser) {
      toast.error('Not authenticated')
      return
    }
    setLoading(true)
    try {
      const session = await getOrCreateSession(selectedHouse, selectedSession, currentUser.id)
      setActiveSession(session)
    } catch (err) {
      toast.error('Failed to open session: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // HM only sees their assigned houses
  const availableHouses = role === 'HM'
    ? HOUSES.filter(h => assignedHouseIds.includes(h.id))
    : HOUSES

  return (
    <div>
      {/* Session overview banner */}
      <SessionBanner currentSession={currentSession} activeSessions={todaySessions} />

      {!activeSession ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-[#1a3a5c] mb-5">Open Attendance Session</h3>

          <div className="space-y-4">
            {/* House selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select House</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableHouses.map(house => (
                  <button
                    key={house.id}
                    onClick={() => setSelectedHouse(house.id)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      selectedHouse === house.id
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={selectedHouse === house.id ? { backgroundColor: house.color, borderColor: house.color } : {}}
                  >
                    {house.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Session selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Session</label>
              <div className="grid grid-cols-3 gap-2">
                {SESSIONS.map(session => {
                  const existing = todaySessions.find(s => s.session_type === session.type)
                  const isCurrent = currentSession?.type === session.type
                  return (
                    <button
                      key={session.type}
                      onClick={() => setSelectedSession(session.type)}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedSession === session.type
                          ? 'bg-[#1a3a5c] text-white border-[#1a3a5c] shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-[#1a3a5c]/30'
                      }`}
                    >
                      <span className="text-base">{session.icon}</span>
                      <span className="block text-xs mt-1">{session.label}</span>
                      {existing && (
                        <span className="block text-xs mt-0.5 opacity-60">
                          {existing.is_finalized ? '✓ Done' : '⏳ Open'}
                        </span>
                      )}
                      {isCurrent && !existing && (
                        <span className="block text-xs mt-0.5 text-[#d97706]">● Now</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleOpenSession}
              loading={loading}
              disabled={!selectedHouse || !selectedSession}
              className="w-full"
            >
              Open Session &amp; Mark Attendance
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Session header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-[#1a3a5c]">
                {SESSIONS.find(s => s.type === activeSession.session_type)?.icon}{' '}
                {SESSIONS.find(s => s.type === activeSession.session_type)?.label} Session
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {HOUSES.find(h => h.id === activeSession.house_id)?.name} House
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Camera size={14} />}
                onClick={() => setShowQR(!showQR)}
              >
                {showQR ? 'Hide' : 'QR Scan'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveSession(null)}>Change</Button>
            </div>
          </div>

          {/* QR scanner */}
          {showQR && (
            <div className="px-6 py-4 border-b border-gray-100">
              <QRScanner onClose={() => setShowQR(false)} />
            </div>
          )}

          {/* Roll call */}
          <div className="px-6 py-4">
            <RollCallList session={activeSession} />
          </div>
        </div>
      )}
    </div>
  )
}
