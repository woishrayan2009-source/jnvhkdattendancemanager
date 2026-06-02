import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { CheckCircle2, XCircle, RefreshCw, Clock4, UserCheck, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { getStudents } from '@/services/students'
import { getPendingLeaves, approveLeave, rejectLeave, getTodaysActiveLeaves, getOverdueLeaves } from '@/services/leave'
import type { LeaveRequest, Student } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending HM',
  approved_hm: 'Approved by HM',
  approved_principal: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  home_leave: 'Home Leave',
  medical_leave: 'Medical Leave',
  casual_leave: 'Casual Leave',
  official_duty: 'Official Duty',
}

export default function Leaves() {
  const { user } = useAuth()
  const [pending, setPending] = useState<LeaveRequest[]>([])
  const [active, setActive] = useState<LeaveRequest[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({})

  const isHM = user?.role === 'house_master' || user?.role === 'associate_hm'
  const isPrincipal = user?.role === 'principal' || user?.role === 'vice_principal'
  const canReview = isHM || isPrincipal || user?.role === 'admin'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [allStudents, pendingLeaves, todaysLeaves, overdueLeaves] = await Promise.all([
          getStudents(),
          getPendingLeaves(user?.role ?? 'gate_guard', user?.assigned_house_ids ?? null),
          getTodaysActiveLeaves(format(new Date(), 'yyyy-MM-dd')),
          getOverdueLeaves(format(new Date(), 'yyyy-MM-dd')),
        ])

        const map = Object.fromEntries(allStudents.map((student) => [student.id, student]))
        setStudentsMap(map)
        setPending(pendingLeaves)
        setActive(todaysLeaves)
        setOverdueCount(overdueLeaves.length)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load leave requests')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user?.role, user?.assigned_house_ids])

  const sortedPending = useMemo(
    () => [...pending].sort((a, b) => a.from_date.localeCompare(b.from_date)),
    [pending],
  )

  const handleApprove = async (leaveId: string) => {
    if (!user) return
    setActionId(leaveId)
    setError(null)
    setMessage(null)
    try {
      await approveLeave(leaveId, user.id, user.role)
      setMessage('Leave approved successfully.')
      void refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to approve leave')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal || !user) return
    setActionId(rejectModal.id)
    setError(null)
    setMessage(null)
    try {
      await rejectLeave(rejectModal.id, user.id, rejectReason)
      setMessage('Leave rejected.')
      setRejectModal(null)
      setRejectReason('')
      void refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reject leave')
    } finally {
      setActionId(null)
    }
  }

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [allStudents, pendingLeaves, todaysLeaves, overdueLeaves] = await Promise.all([
        getStudents(),
        getPendingLeaves(user?.role ?? 'gate_guard', user?.assigned_house_ids ?? null),
        getTodaysActiveLeaves(format(new Date(), 'yyyy-MM-dd')),
        getOverdueLeaves(format(new Date(), 'yyyy-MM-dd')),
      ])
      setStudentsMap(Object.fromEntries(allStudents.map((student) => [student.id, student])))
      setPending(pendingLeaves)
      setActive(todaysLeaves)
      setOverdueCount(overdueLeaves.length)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh leave requests')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Review leave requests, active outgoings, and overdue returns</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending approvals</p>
              <h2 className="text-3xl font-semibold text-slate-900">{pending.length}</h2>
            </div>
            <Button variant="secondary" onClick={refresh} leftIcon={<RefreshCw size={16} />}>
              Refresh
            </Button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">Loading leave requests…</div>
            ) : sortedPending.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No pending leave requests.</div>
            ) : (
              sortedPending.map((leave) => {
                const student = studentsMap[leave.student_id]
                const duration = differenceInDays(parseISO(leave.to_date), parseISO(leave.from_date)) + 1
                return (
                  <div key={leave.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900">{student?.full_name ?? 'Unknown student'}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type}</span>
                          <span>{leave.from_date} → {leave.to_date}</span>
                          <span>{duration} day{duration !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{STATUS_LABELS[leave.status] ?? leave.status}</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{leave.guardian_contact}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="text-sm text-slate-600">{leave.reason}</div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {canReview && (
                          <Button
                            onClick={() => void handleApprove(leave.id)}
                            loading={actionId === leave.id}
                            leftIcon={<CheckCircle2 size={16} />}
                          >
                            {isHM && !isPrincipal ? 'Approve HM' : 'Approve'}
                          </Button>
                        )}
                        {(isPrincipal || user?.role === 'admin') && (
                          <Button
                            variant="danger"
                            onClick={() => setRejectModal({ id: leave.id })}
                            loading={actionId === leave.id}
                            leftIcon={<XCircle size={16} />}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Today’s leaves</p>
            <div className="mt-4 text-3xl font-semibold text-slate-900">{active.length}</div>
            <p className="mt-2 text-sm text-slate-600">Students currently out on approved leave.</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Overdue returns</p>
                <p className="text-sm text-slate-600 mt-1">{overdueCount} student{overdueCount !== 1 ? 's' : ''} are overdue to return.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Reject leave request</h2>
            <p className="mt-2 text-sm text-slate-500">Provide a short reason for rejection so the HM and student can see the outcome.</p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder="Reason for rejection (optional)"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason('') }}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject} loading={actionId === rejectModal.id}>
                Confirm reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
