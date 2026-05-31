import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { createStudent, updateStudent, fetchClasses } from '../../services/students'
import { HOUSES } from '../../lib/supabase'

export function StudentForm({ student, onSuccess, onCancel }) {
  const toast = useToast()
  const isEdit = !!student
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState([])

  const [form, setForm] = useState({
    name:             student?.name || '',
    roll_number:      student?.roll_number || '',
    gender:           student?.gender || 'Male',
    house_id:         student?.house_id || '',
    class_id:         student?.class_id || '',
    admission_number: student?.admission_number || '',
    date_of_birth:    student?.date_of_birth || '',
    parent_name:      student?.parent_name || '',
    parent_phone:     student?.parent_phone || '',
  })

  useEffect(() => {
    fetchClasses().then(setClasses)
  }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.house_id || !form.class_id) {
      toast.error('Please select a house and class')
      return
    }
    setLoading(true)
    try {
      if (isEdit) {
        await updateStudent(student.id, form)
        toast.success('Student updated!')
      } else {
        await createStudent(form)
        toast.success('Student added!')
      }
      onSuccess?.()
    } catch (err) {
      toast.error((isEdit ? 'Update' : 'Create') + ' failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className={inputCls}
            required
            placeholder="e.g. Rahul Kumar"
          />
        </div>

        <div>
          <label className={labelCls}>Roll Number *</label>
          <input
            type="text"
            value={form.roll_number}
            onChange={e => update('roll_number', e.target.value)}
            className={inputCls}
            required
            placeholder="e.g. NL-001"
          />
        </div>

        <div>
          <label className={labelCls}>Admission No.</label>
          <input
            type="text"
            value={form.admission_number}
            onChange={e => update('admission_number', e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className={labelCls}>Gender *</label>
          <select
            value={form.gender}
            onChange={e => update('gender', e.target.value)}
            className={inputCls}
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Date of Birth</label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={e => update('date_of_birth', e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>House *</label>
          <select
            value={form.house_id}
            onChange={e => update('house_id', e.target.value)}
            className={inputCls}
            required
          >
            <option value="">-- Select House --</option>
            {HOUSES.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Class *</label>
          <select
            value={form.class_id}
            onChange={e => update('class_id', e.target.value)}
            className={inputCls}
            required
          >
            <option value="">-- Select Class --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                Class {c.grade} {c.section}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Parent / Guardian Name</label>
          <input
            type="text"
            value={form.parent_name}
            onChange={e => update('parent_name', e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Parent Phone</label>
          <input
            type="tel"
            value={form.parent_phone}
            onChange={e => update('parent_phone', e.target.value)}
            className={inputCls}
            placeholder="Optional, 10-digit mobile"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {isEdit ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  )
}
