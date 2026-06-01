import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, RefreshCw, Edit2 } from 'lucide-react'
import { fetchStudents } from '../services/students'
import { StudentForm } from '../components/admin/StudentForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'
import { HOUSES } from '../lib/supabase'

export default function Students() {
  const { role, assignedHouseIds } = useAuth()
  const toast = useToast()

  // Role checks using new role system
  const canEdit = role === 'ADMIN' || role === 'PRINCIPAL'
  const isHM    = role === 'HM'

  const [students, setStudents]       = useState([])
  const [loading,  setLoading]        = useState(true)
  const [search,   setSearch]         = useState('')
  const [houseFilter, setHouseFilter] = useState(isHM ? (assignedHouseIds[0] ?? '') : '')
  const [gradeFilter, setGradeFilter] = useState('')
  const [showAdd,  setShowAdd]        = useState(false)
  const [editStudent, setEditStudent] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      // HM only sees their house
      const houseId = isHM ? (assignedHouseIds[0] ?? null) : (houseFilter || null)
      const data = await fetchStudents({ houseId })
      setStudents(data)
    } catch (err) {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [houseFilter, isHM, JSON.stringify(assignedHouseIds)])

  const filtered = useMemo(() => {
    let list = students
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q)
      )
    }
    if (gradeFilter) list = list.filter(s => s.classes?.grade?.toString() === gradeFilter)
    return list
  }, [students, search, gradeFilter])

  const grades = [...new Set(students.map(s => s.classes?.grade).filter(Boolean))].sort()

  const handleSuccess = () => {
    setShowAdd(false)
    setEditStudent(null)
    load()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a3a5c]">Student Roster</h2>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} active students</p>
        </div>
        {canEdit && (
          <Button id="add-student-btn" variant="primary" leftIcon={<Plus size={15} />} onClick={() => setShowAdd(true)}>
            Add Student
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, roll or admission no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
          />
        </div>

        {/* House filter — hidden for HM (they only see their house) */}
        {!isHM && (
          <select
            value={houseFilter}
            onChange={e => setHouseFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
          >
            <option value="">All Houses</option>
            {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
        >
          <option value="">All Classes</option>
          {grades.map(g => <option key={g} value={g}>Class {g}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="animate-spin text-[#1a3a5c]" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a3a5c]/5 text-left">
                  {['Roll No', 'Name', 'Class', 'House', 'Gender', 'Parent', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{student.roll_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{student.name}</p>
                      {student.admission_number && <p className="text-xs text-gray-400">Adm: {student.admission_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Cls {student.classes?.grade} {student.classes?.section}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" style={{ borderLeft: `3px solid ${student.houses?.color}` }}>
                        {student.houses?.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.gender}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{student.parent_name || '-'}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditStudent(student)}
                          className="p-1.5 text-gray-400 hover:text-[#1a3a5c] hover:bg-[#1a3a5c]/10 rounded-lg transition-colors"
                          title="Edit student"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Student" size="lg">
        <StudentForm onSuccess={handleSuccess} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editStudent} onClose={() => setEditStudent(null)} title="Edit Student" size="lg">
        {editStudent && (
          <StudentForm student={editStudent} onSuccess={handleSuccess} onCancel={() => setEditStudent(null)} />
        )}
      </Modal>
    </div>
  )
}
