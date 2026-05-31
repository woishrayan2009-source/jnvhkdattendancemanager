import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Clock, CheckCircle2, XCircle, ArrowUpCircle,
  RefreshCw, Phone, User, Home, AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, LeaveRequest, Student } from '../db/schema';
import {
  approveLeave, rejectLeave, getPendingLeaves
} from '../services/LeaveService';

const STATUS_COLORS: Record<string, string> = {
  PENDING_HM:        'bg-yellow-100 text-yellow-800',
  PENDING_PRINCIPAL: 'bg-orange-100 text-orange-800',
  APPROVED:          'bg-emerald-100 text-emerald-800',
  REJECTED:          'bg-red-100 text-red-700',
  COMPLETED:         'bg-gray-100 text-gray-600',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  LOCAL_LEAVE:   'Local Leave',
  HOME_LEAVE:    'Home Leave',
  MEDICAL:       'Medical',
  EMERGENCY:     'Emergency',
  OFFICIAL_DUTY: 'Official Duty',
};

interface EnrichedLeave extends LeaveRequest {
  studentName?: string;
  houseName?: string;
}

export default function LeaveApproval() {
  const { currentUser, role, assignedHouseIds } = useAuth();

  const [leaves,    setLeaves]    = useState<EnrichedLeave[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [actionId,  setActionId]  = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pending = await getPendingLeaves(role!, assignedHouseIds);
      // Enrich with student names and house names
      const enriched: EnrichedLeave[] = await Promise.all(pending.map(async l => {
        const student = await db.students.get(l.student_id);
        const house   = student?.house_id ? await db.houses.get(student.house_id) : null;
        return { ...l, studentName: student?.name ?? 'Unknown', houseName: house?.name ?? '—' };
      }));
      setLeaves(enriched.sort((a, b) => a.start_date.localeCompare(b.start_date)));
    } finally {
      setLoading(false);
    }
  }, [role, assignedHouseIds]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (leaveId: string) => {
    if (!currentUser || !role) return;
    setActionId(leaveId);
    try {
      await approveLeave(leaveId, role as 'HM' | 'PRINCIPAL', currentUser.id);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !currentUser) return;
    setActionId(rejectModal.id);
    try {
      await rejectLeave(rejectModal.id, currentUser.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      await load();
    } finally {
      setActionId(null);
    }
  };

  const dayCount = (l: LeaveRequest) =>
    differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leave Approvals</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
          <RefreshCw className="animate-spin" size={20} /> Loading…
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No pending leave requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaves.map(leave => {
            const days = dayCount(leave);
            const isLongLeave = days > 3 || leave.leave_type === 'MEDICAL' || leave.leave_type === 'EMERGENCY';
            const isProcessing = actionId === leave.id;

            return (
              <div key={leave.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a3a5c]/10 flex items-center justify-center text-[#1a3a5c] font-bold text-sm">
                      {leave.studentName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{leave.studentName}</p>
                      <p className="text-xs text-gray-400">{leave.houseName} House</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                      {LEAVE_TYPE_LABELS[leave.leave_type]}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[leave.status]}`}>
                      {leave.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Dates</p>
                    <p className="font-semibold text-gray-700">
                      {format(parseISO(leave.start_date), 'dd MMM')} – {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                      <span className="ml-2 text-xs text-gray-400">({days} day{days !== 1 ? 's' : ''})</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Departure / Return</p>
                    <p className="font-semibold text-gray-700">{leave.departure_time} → {leave.return_time}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 font-medium mb-1">Reason</p>
                    <p className="text-gray-700">{leave.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1"><User size={11} /> Guardian</p>
                    <p className="font-medium text-gray-700">{leave.guardian_name}</p>
                    <p className="text-xs text-gray-500">{leave.guardian_relation} · {leave.pickup_mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1"><Phone size={11} /> Contact</p>
                    <p className="font-semibold text-blue-600">{leave.guardian_phone}</p>
                    {leave.alt_emergency_contact && (
                      <p className="text-xs text-gray-400">{leave.alt_emergency_contact} (alt)</p>
                    )}
                  </div>
                </div>

                {/* Long leave notice */}
                {isLongLeave && role === 'HM' && (
                  <div className="mx-5 mb-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-xs text-orange-700">
                    <AlertCircle size={13} className="shrink-0" />
                    Long / medical leave — will be forwarded to Principal for final approval.
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 px-5 pb-4">
                  {/* HM can approve/forward, Principal can approve */}
                  {(role === 'HM' || role === 'PRINCIPAL' || role === 'ADMIN') && (
                    <button
                      onClick={() => handleApprove(leave.id)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {isProcessing
                        ? <RefreshCw size={14} className="animate-spin" />
                        : role === 'HM' && isLongLeave
                          ? <><ArrowUpCircle size={15} /> Forward to Principal</>
                          : <><CheckCircle2 size={15} /> Approve</>
                      }
                    </button>
                  )}
                  {/* Principal + Admin can reject */}
                  {(role === 'PRINCIPAL' || role === 'ADMIN') && (
                    <button
                      onClick={() => setRejectModal({ id: leave.id })}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reject Leave?</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason (optional — visible to HM and student).</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionId}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
