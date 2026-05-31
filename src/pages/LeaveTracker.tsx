import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CheckCircle2, Phone, RefreshCw, LogIn } from 'lucide-react';
import { db, LeaveRequest, Student, Hostel } from '../db/schema';
import { getTodaysLeaves, getOverdueLeaves, markReturned } from '../services/LeaveService';

interface EnrichedLeave extends LeaveRequest {
  studentName: string;
  hostelName: string;
}

async function enrich(leaves: LeaveRequest[]): Promise<EnrichedLeave[]> {
  return Promise.all(leaves.map(async l => {
    const student: Student | undefined = await db.students.get(l.student_id);
    const hostel:  Hostel  | undefined = student?.hostel_id ? await db.hostels.get(student.hostel_id) : undefined;
    return { ...l, studentName: student?.name ?? 'Unknown', hostelName: hostel?.name ?? '—' };
  }));
}

const today = () => new Date().toISOString().split('T')[0];

export default function LeaveTracker() {
  const [todaysLeaves,  setTodaysLeaves]  = useState<EnrichedLeave[]>([]);
  const [overdueLeaves, setOverdueLeaves] = useState<EnrichedLeave[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionId,      setActionId]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todays, overdue] = await Promise.all([getTodaysLeaves(), getOverdueLeaves()]);
      const [enrichedToday, enrichedOverdue] = await Promise.all([enrich(todays), enrich(overdue)]);
      setTodaysLeaves(enrichedToday);
      setOverdueLeaves(enrichedOverdue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkReturned = async (leaveId: string) => {
    setActionId(leaveId);
    try {
      await markReturned(leaveId);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const LeaveCard: React.FC<{ leave: EnrichedLeave; overdue?: boolean }> = ({ leave, overdue }) => (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
      overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'
    }`}>
      {overdue && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-semibold">
          <AlertTriangle size={13} />
          OVERDUE — Expected return: {format(parseISO(leave.end_date), 'dd MMM yyyy')}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              overdue ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-[#1a3a5c]'
            }`}>
              {leave.studentName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{leave.studentName}</p>
              <p className="text-xs text-gray-400">{leave.hostelName}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Returns</p>
            <p className={`text-sm font-semibold ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
              {format(parseISO(leave.end_date), 'dd MMM')} at {leave.return_time}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Phone size={11} />
              <a href={`tel:${leave.guardian_phone}`} className="text-blue-600 font-medium hover:underline">
                {leave.guardian_phone}
              </a>
            </span>
            <span>{leave.guardian_name} ({leave.guardian_relation || leave.pickup_mode})</span>
          </div>

          <button
            onClick={() => handleMarkReturned(leave.id)}
            disabled={actionId === leave.id}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
          >
            {actionId === leave.id
              ? <RefreshCw size={12} className="animate-spin" />
              : <LogIn size={12} />
            }
            Mark Returned
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Tracker</h1>
          <p className="text-sm text-gray-400 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
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
      ) : (
        <>
          {/* ── Overdue ───────────────────────────────────── */}
          {overdueLeaves.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-semibold text-red-600">Overdue Returns ({overdueLeaves.length})</h2>
              </div>
              <div className="space-y-3">
                {overdueLeaves.map(l => <LeaveCard key={l.id} leave={l} overdue />)}
              </div>
            </section>
          )}

          {/* ── Today's leaves ────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h2 className="font-semibold text-gray-700">On Leave Today ({todaysLeaves.length})</h2>
            </div>
            {todaysLeaves.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">No students on leave today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysLeaves.map(l => <LeaveCard key={l.id} leave={l} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
