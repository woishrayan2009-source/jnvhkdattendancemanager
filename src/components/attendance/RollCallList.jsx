import React, { useState, useEffect, useMemo } from 'react'
import { Search, Send, RefreshCw, AlertTriangle } from 'lucide-react'
import { StudentRow } from './StudentRow'
import { Button } from '../ui/Button'
import { useAttendanceStore } from '../../store/attendanceStore'
import { useAuth } from '../../hooks/useAuth'
import { fetchStudents, fetchStudentsOffline } from '../../services/students'
import { getSessionRecords, saveAttendance, submitSession } from '../../services/attendance'
import { useToast } from '../ui/Toast'

export function RollCallList({ session }) {
  const { currentUser, role } = useAuth()
  const isOnline = navigator.onLine
  const toast  = useToast()
  const store  = useAttendanceStore()

  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const isFinalized = session?.is_finalized
  const canAmend = isFinalized && (
    (role === 'HM' && session?.opened_by === currentUser?.id) ||
    role === 'PRINCIPAL' || role === 'ADMIN'
  )

  useEffect(() => {
    if (!session) return
    loadData()
  }, [session?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const students = isOnline
        ? await fetchStudents({ houseId: session.house_id })
        : await fetchStudentsOffline(session.house_id)

      const records = await getSessionRecords(session.id)
      store.setStudents(students)
      store.initRecords(students, records)
    } catch (err) {
      toast.error('Failed to load students: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!search) return store.students
    const q = search.toLowerCase()
    return store.students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q)
    )
  }, [store.students, search])

  const summary = store.getSummary()

  const handleSave = async () => {
    store.setIsSubmitting(true)
    try {
      const records = store.students.map(s => ({
        student_id: s.id,
        ...store.getRecord(s.id),
      }))
      await saveAttendance(session.id, records, currentUser.id)
      toast.success(`Attendance saved! ${isOnline ? '' : '(Queued for sync)'}`)
    } catch (err) {
      toast.error('Save failed: ' + err.message)
    } finally {
      store.setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    store.setIsSubmitting(true)
    try {
      await handleSave()
      await submitSession(session.id, currentUser.id)
      toast.success('Session finalized!')
      setShowConfirm(false)
    } catch (err) {
      toast.error('Submit failed: ' + err.message)
    } finally {
      store.setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-[#1a3a5c]" size={24} />
        <span className="ml-3 text-gray-500">Loading students…</span>
      </div>
    )
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[['Total', summary.total, 'bg-gray-50 text-gray-700'],
          ['Present', summary.present, 'bg-emerald-50 text-emerald-700'],
          ['Absent',  summary.absent,  'bg-red-50 text-red-700'],
          ['Leave',   summary.leave,   'bg-amber-50 text-amber-700'],
        ].map(([label, count, cls]) => (
          <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Finalized banner */}
      {isFinalized && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 text-sm ${
          canAmend ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}>
          <AlertTriangle size={14} />
          {canAmend
            ? 'Session is finalized. You can amend records below.'
            : 'Session is finalized. Contact House Master or Principal to amend.'}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or roll number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
        />
      </div>

      {/* Student list */}
      <div className="space-y-0.5">
        {filteredStudents.map(student => (
          <StudentRow
            key={student.id}
            student={student}
            record={store.getRecord(student.id)}
            onMark={store.markStudent}
            isFinalized={isFinalized}
            canAmend={canAmend}
          />
        ))}
        {filteredStudents.length === 0 && (
          <p className="text-center text-gray-400 py-8">No students found.</p>
        )}
      </div>

      {/* Action bar */}
      {!isFinalized && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 mt-4 -mx-4 sm:-mx-6 rounded-b-xl">
          <Button
            variant="secondary"
            onClick={handleSave}
            loading={store.isSubmitting}
            className="flex-1"
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            leftIcon={<Send size={15} />}
            onClick={() => setShowConfirm(true)}
            loading={store.isSubmitting}
            className="flex-1"
          >
            Submit Final
          </Button>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1a3a5c] mb-2">Submit Attendance?</h3>
            <p className="text-sm text-gray-600 mb-2">
              This will finalize the session. Summary:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm grid grid-cols-3 gap-2 text-center">
              <div><span className="font-bold text-emerald-600">{summary.present}</span><br/><span className="text-xs text-gray-500">Present</span></div>
              <div><span className="font-bold text-red-600">{summary.absent}</span><br/><span className="text-xs text-gray-500">Absent</span></div>
              <div><span className="font-bold text-amber-600">{summary.leave}</span><br/><span className="text-xs text-gray-500">Leave</span></div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={handleSubmit} loading={store.isSubmitting} className="flex-1">Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
