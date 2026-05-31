import React, { useState, useMemo, useCallback } from 'react';
import { Search, UserCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, Student, LeaveType, PickupMode } from '../db/schema';
import { submitLeaveRequest } from '../services/LeaveService';

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'LOCAL_LEAVE',    label: 'Local Leave' },
  { value: 'HOME_LEAVE',     label: 'Home Leave' },
  { value: 'MEDICAL',        label: 'Medical Leave' },
  { value: 'EMERGENCY',      label: 'Emergency' },
  { value: 'OFFICIAL_DUTY',  label: 'Official Duty' },
];

const PICKUP_MODES: { value: PickupMode; label: string }[] = [
  { value: 'GUARDIAN',  label: 'Guardian' },
  { value: 'RELATIVE',  label: 'Relative' },
  { value: 'ESCORT',    label: 'Escort' },
];

const today = () => new Date().toISOString().split('T')[0];

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white";

export default function LeaveRequest() {
  const { currentUser } = useAuth();

  // Student search
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Student[]>([]);
  const [student,  setStudent]  = useState<Student | null>(null);
  const [searching, setSearching] = useState(false);

  // Form fields
  const [leaveType,   setLeaveType]   = useState<LeaveType>('LOCAL_LEAVE');
  const [startDate,   setStartDate]   = useState(today());
  const [endDate,     setEndDate]     = useState(today());
  const [depTime,     setDepTime]     = useState('14:00');
  const [retTime,     setRetTime]     = useState('18:00');
  const [reason,      setReason]      = useState('');
  const [gName,       setGName]       = useState('');
  const [gPhone,      setGPhone]      = useState('');
  const [gRelation,   setGRelation]   = useState('');
  const [pickupMode,  setPickupMode]  = useState<PickupMode>('GUARDIAN');
  const [altContact,  setAltContact]  = useState('');

  const [submitting, setSubmitting]  = useState(false);
  const [error,      setError]       = useState<string | null>(null);
  const [success,    setSuccess]     = useState(false);

  // ── Student search ─────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const lower = q.toLowerCase();
      const res = await db.students
        .filter(s => s.name.toLowerCase().includes(lower) || s.id.toLowerCase().includes(lower))
        .limit(10)
        .toArray();
      setResults(res);
    } finally {
      setSearching(false);
    }
  }, []);

  const selectStudent = (s: Student) => {
    setStudent(s);
    setQuery(s.name);
    setResults([]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !currentUser) return;
    if (!reason.trim()) { setError('Please provide a reason.'); return; }
    if (!gName.trim() || !gPhone.trim()) { setError('Guardian name and phone are required.'); return; }
    if (endDate < startDate) { setError('End date cannot be before start date.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await submitLeaveRequest({
        student_id: student.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        departure_time: depTime,
        return_time: retTime,
        reason,
        guardian_name: gName,
        guardian_phone: gPhone,
        guardian_relation: gRelation,
        pickup_mode: pickupMode,
        alt_emergency_contact: altContact,
        submitted_by: currentUser.id,
      });
      setSuccess(true);
      // Reset
      setStudent(null); setQuery('');
      setReason(''); setGName(''); setGPhone(''); setGRelation(''); setAltContact('');
      setStartDate(today()); setEndDate(today());
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Submit Leave Request</h1>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-5">
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-sm font-medium">Leave request submitted! Status: Pending HM approval.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Student search ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Student</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search student by name…"
              value={query}
              onChange={e => handleSearch(e.target.value)}
            />
            {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}

            {results.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                {results.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectStudent(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">ID: {s.id.slice(0, 8)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {student && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
              <UserCheck size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{student.name}</p>
                <p className="text-xs text-blue-500">House ID: {student.house_id?.slice(0, 8)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Leave details ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Leave Details</h2>

          <Field label="Leave Type" required>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} className={inputCls}>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="From Date" required>
              <input type="date" value={startDate} min={today()} onChange={e => setStartDate(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="To Date" required>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Departure Time" required>
              <input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Expected Return" required>
              <input type="time" value={retTime} onChange={e => setRetTime(e.target.value)} className={inputCls} required />
            </Field>
          </div>

          <Field label="Reason" required>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Brief description of reason for leave…"
              className={`${inputCls} resize-none`}
              required
            />
          </Field>
        </div>

        {/* ── Guardian details ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Guardian / Escort Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Guardian Name" required>
              <input type="text" value={gName} onChange={e => setGName(e.target.value)} className={inputCls} placeholder="Full name" required />
            </Field>
            <Field label="Guardian Phone" required>
              <input type="tel" value={gPhone} onChange={e => setGPhone(e.target.value)} className={inputCls} placeholder="10-digit number" required />
            </Field>
            <Field label="Relation">
              <input type="text" value={gRelation} onChange={e => setGRelation(e.target.value)} className={inputCls} placeholder="e.g. Father, Uncle" />
            </Field>
            <Field label="Pickup Mode" required>
              <select value={pickupMode} onChange={e => setPickupMode(e.target.value as PickupMode)} className={inputCls}>
                {PICKUP_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Alternate Emergency Contact">
            <input type="tel" value={altContact} onChange={e => setAltContact(e.target.value)} className={inputCls} placeholder="Alternate phone number" />
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting || !student}
          className="w-full bg-[#1a3a5c] hover:bg-[#152e4d] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            : 'Submit Leave Request'
          }
        </button>
      </form>
    </div>
  );
}
