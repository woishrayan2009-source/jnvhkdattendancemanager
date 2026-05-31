import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { StatusBadge } from '../ui/Badge'
import { LEAVE_TYPES } from '../../lib/supabase'

export function StudentRow({ student, record, onMark, isFinalized, canAmend }) {
  const [showLeaveMenu, setShowLeaveMenu] = useState(false)

  const status    = record?.status    || 'present'
  const leaveType = record?.leave_type || null

  const handleStatus = (newStatus) => {
    if (newStatus === 'leave') {
      setShowLeaveMenu(true)
      return
    }
    onMark(student.id, newStatus, null)
  }

  const handleLeave = (code) => {
    onMark(student.id, 'leave', code)
    setShowLeaveMenu(false)
  }

  const isDisabled = isFinalized && !canAmend

  const rowBg = status === 'absent' ? 'bg-red-50 border-red-100'
    : status === 'leave' ? 'bg-amber-50 border-amber-100'
    : 'bg-white border-gray-100'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg mb-1 transition-colors ${rowBg} ${isDisabled ? 'opacity-60' : ''}`}>
      {/* Roll + Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{student.roll_number}</span>
          <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
        </div>
        <p className="text-xs text-gray-400 ml-16">
          Cls {student.classes?.grade}{student.classes?.section} · {student.gender}
        </p>
      </div>

      {/* Status */}
      <StatusBadge status={status} leaveType={leaveType} />

      {/* Action buttons */}
      {!isDisabled && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStatus('present')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              status === 'present'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            P
          </button>
          <button
            onClick={() => handleStatus('absent')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              status === 'absent'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            A
          </button>

          {/* Leave dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLeaveMenu(!showLeaveMenu)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                status === 'leave'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              L <ChevronDown size={10} />
            </button>

            {showLeaveMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {LEAVE_TYPES.map(lt => (
                  <button
                    key={lt.code}
                    onClick={() => handleLeave(lt.code)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 flex justify-between items-center"
                  >
                    <span className="text-gray-700">{lt.label}</span>
                    <span className="font-mono text-amber-600 font-bold">{lt.code}</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowLeaveMenu(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
