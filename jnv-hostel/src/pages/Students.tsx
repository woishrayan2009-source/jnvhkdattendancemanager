import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { getStudents } from '@/services/students'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { HOUSES } from '@/constants/houses'
import type { Student } from '@/types'

export default function Students() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [filterHouse, setFilterHouse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await getStudents()
        setStudents(rows)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load students')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const visibleHouses = useMemo(() => {
    if (!user?.assigned_house_ids) return HOUSES
    return HOUSES.filter((house) => user.assigned_house_ids?.includes(house.id))
  }, [user?.assigned_house_ids])

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students.filter((student) => {
      if (filterHouse && student.house_id !== filterHouse) return false
      if (query === '') return true
      return (
        student.full_name.toLowerCase().includes(query) ||
        student.admission_no.toLowerCase().includes(query) ||
        student.roll_no.toLowerCase().includes(query)
      )
    })
  }, [students, search, filterHouse])

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Records</h1>
          <p className="page-subtitle">View and search students assigned to your house(s)</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-slate-500">Registered students</p>
            <h2 className="text-3xl font-semibold text-slate-900">{students.length}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" leftIcon={<Users size={16} />}>
              Bulk actions
            </Button>
            <Button leftIcon={<Plus size={16} />}>
              Add student
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1.5fr_0.9fr]">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students by name, admission no or roll no"
              className="input-base pl-10"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilterHouse(null)}
              className={clsx('rounded-2xl px-4 py-3 text-sm font-semibold transition', filterHouse === null ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              All houses
            </button>
            {visibleHouses.map((house) => (
              <button
                key={house.id}
                onClick={() => setFilterHouse((prev) => (prev === house.id ? null : house.id))}
                className={clsx('rounded-2xl px-4 py-3 text-sm font-semibold transition', filterHouse === house.id ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
              >
                {house.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_0.7fr] gap-0.5 bg-slate-100 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Name</span>
          <span className="hidden lg:inline">House</span>
          <span>Class</span>
          <span>Guardian</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading students…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No students match your search.</div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="grid grid-cols-[2.5fr_1fr_1fr_1fr_0.7fr] gap-0.5 border-t border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-900">{student.full_name}</div>
                <div className="mt-1 text-xs text-slate-500">Adm. {student.admission_no} · Roll {student.roll_no}</div>
              </div>
              <div className="hidden lg:block">{HOUSES.find((house) => house.id === student.house_id)?.name ?? '—'}</div>
              <div>{student.class_no} / {student.section}</div>
              <div>{student.guardian_phone}</div>
              <div>
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
