import React, { useState, useEffect } from 'react'
import { Trash2, RefreshCw, Search } from 'lucide-react'
import { getLeaves, deleteLeave } from '../../services/leaves'
import { Badge, StatusBadge } from '../ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import { format, differenceInDays } from 'date-fns'

export function LeaveList({ studentId, refresh }) {
  const { role } = useAuth()
  const toast = useToast()
  const [leaves, setLeaves]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const canDelete = role === 'ADMIN' || role === 'PRINCIPAL'

  const load = async () => {
    setLoading(true)
    try {
      const data = await getLeaves({ studentId })
      setLeaves(data)
    } catch (err) {
      toast.error('Failed to load leaves')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [studentId, refresh])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave record?')) return
    try {
      await deleteLeave(id)
      setLeaves(ls => ls.filter(l => l.id !== id))
      toast.success('Leave deleted')
    } catch (err) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const filtered = search
    ? leaves.filter(l =>
        l.students?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.students?.roll_number?.toLowerCase().includes(search.toLowerCase())
      )
    : leaves

  if (loading) return (
    <div className="flex justify-center py-8">
      <RefreshCw className="animate-spin text-[#1a3a5c]" size={20} />
    </div>
  )

  return (
    <div>
      {!studentId && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student name or roll…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No leave records found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(leave => {
            const days = differenceInDays(new Date(leave.to_date), new Date(leave.from_date)) + 1
            return (
              <div key={leave.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4">
                <Badge variant={leave.leave_type} className="mt-0.5 shrink-0">{leave.leave_type}</Badge>
                <div className="flex-1 min-w-0">
                  {!studentId && (
                    <p className="font-medium text-sm text-gray-800">
                      {leave.students?.name}
                      <span className="text-gray-400 text-xs ml-1">({leave.students?.roll_number})</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {format(new Date(leave.from_date), 'dd MMM yyyy')}
                    {leave.from_date !== leave.to_date && ` → ${format(new Date(leave.to_date), 'dd MMM yyyy')}`}
                    <span className="ml-1 font-medium">({days}d)</span>
                  </p>
                  {leave.reason && <p className="text-xs text-gray-400 mt-1 truncate">{leave.reason}</p>}
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(leave.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
