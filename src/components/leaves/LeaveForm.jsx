import React, { useState, useEffect } from 'react'
import { Calendar, User } from 'lucide-react'
import { Button } from '../ui/Button'
import { differenceInDays } from 'date-fns'
import { LEAVE_TYPES, SCHOOL_ID } from '../../lib/supabase'
import { recordLeave } from '../../services/leaves'
import { fetchStudents } from '../../services/students'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
export function LeaveForm({ onSuccess, prefillStudentId }) {
  const { currentUser, role, assignedHouseIds } = useAuth()
  const toast = useToast()

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    student_id: prefillStudentId || '',
    leave_type: 'HL',
    from_date:  new Date().toISOString().slice(0, 10),
    to_date:    new Date().toISOString().slice(0, 10),
    reason:     '',
  })

  useEffect(() => {
    const load = async () => {
      const houseId = role === 'HM' ? (assignedHouseIds[0] ?? null) : null
      const data = await fetchStudents({ houseId })
      setStudents(data)
    }
    load()
  }, [role, assignedHouseIds])

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.student_id) { toast.error('Please select a student'); return }
    if (form.to_date < form.from_date) { toast.error('End date cannot be before start date'); return }

    setLoading(true)
    try {
      await recordLeave({ ...form, recorded_by: currentUser.id })
      toast.success('Leave recorded successfully!')
      onSuccess?.()
      setForm(f => ({ ...f, student_id: prefillStudentId || '', reason: '' }))
    } catch (err) {
      toast.error('Failed to record leave: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const duration = form.from_date && form.to_date
    ? Math.max(0, differenceInDays(new Date(form.to_date), new Date(form.from_date)) + 1)
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <User size={14} className="inline mr-1" />Student
        </label>
        <select
          value={form.student_id}
          onChange={e => update('student_id', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
          required
        >
          <option value="">-- Select Student --</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.roll_number} — {s.name} (Cls {s.classes?.grade}{s.classes?.section})
            </option>
          ))}
        </select>
      </div>

      {/* Leave type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
        <div className="grid grid-cols-5 gap-2">
          {LEAVE_TYPES.map(lt => (
            <button
              key={lt.code}
              type="button"
              onClick={() => update('leave_type', lt.code)}
              className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                form.leave_type === lt.code
                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a3a5c]'
              }`}
              title={lt.label}
            >
              {lt.code}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {LEAVE_TYPES.find(l => l.code === form.leave_type)?.label}
        </p>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Calendar size={14} className="inline mr-1" />From Date
          </label>
          <input
            type="date"
            value={form.from_date}
            onChange={e => update('from_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
          <input
            type="date"
            value={form.to_date}
            min={form.from_date}
            onChange={e => update('to_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
            required
          />
        </div>
      </div>

      {duration > 0 && (
        <p className="text-xs text-[#1a3a5c] font-medium">
          Duration: {duration} day{duration > 1 ? 's' : ''}
        </p>
      )}

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
        <textarea
          value={form.reason}
          onChange={e => update('reason', e.target.value)}
          rows={3}
          placeholder="Enter reason for leave…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] resize-none"
        />
      </div>

      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Record Leave
      </Button>
    </form>
  )
}
