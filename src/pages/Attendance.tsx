import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Search, CheckSquare, Lock, Unlock, RefreshCw, Save } from 'lucide-react';
import { RollCallList } from '../components/RollCallList';
import { useAuth } from '../hooks/useAuth';
import {
  getStudentsForHouse,
  getAttendanceForDate,
  saveAttendance,
  createUnlockOverride,
  AttendanceStatus,
} from '../services/AttendanceService';
import { HOUSES, SESSIONS } from '../lib/supabase';
import { Student } from '../db/schema';

type Session = 'morning' | 'evening' | 'night';
type RecordMap = Record<string, AttendanceStatus>;

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export default function Attendance() {
  const { currentUser, role, assignedHouseIds } = useAuth();

  const availableHouses = useMemo(() => {
    if (role === 'HM') return HOUSES.filter((h) => assignedHouseIds.includes(h.id));
    return HOUSES;
  }, [role, assignedHouseIds]);

  const [selectedHouse, setSelectedHouse] = useState<string>(availableHouses[0]?.id || '');
  const [selectedSession, setSelectedSession] = useState<Session>('morning');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<RecordMap>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const isDateLocked = !isToday(parseISO(selectedDate)) && !unlocked;

  // ─── Load students + existing records ──────────────────────────────────
  useEffect(() => {
    if (!selectedHouse) return;
    setLoading(true);

    Promise.all([
      getStudentsForHouse(selectedHouse),
      getAttendanceForDate(selectedHouse, selectedDate),
    ])
      .then(([sts, recs]) => {
        setStudents(sts);
        // Pre-fill all students as PRESENT, then overlay saved records
        const initial: RecordMap = {};
        sts.forEach((s) => (initial[s.id] = 'PRESENT'));
        recs.forEach((r) => (initial[r.student_id] = r.status));
        setRecords(initial);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedHouse, selectedDate]);

  // ─── Search filter ──────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [students, search]);

  // ─── Mark All Present ──────────────────────────────────────────────────
  const markAllPresent = useCallback(() => {
    const all: RecordMap = {};
    students.forEach((s) => (all[s.id] = 'PRESENT'));
    setRecords(all);
  }, [students]);

  // ─── Status toggle handler ─────────────────────────────────────────────
  const handleMark = useCallback((studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  }, []);

  // ─── Save to Dexie (dirty=true → SyncService picks it up) ─────────────
  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const inputs = Object.entries(records).map(([student_id, status]) => ({
        student_id,
        date: selectedDate,
        status,
        recorded_by: currentUser.id,
      }));
      await saveAttendance(inputs);
    } finally {
      setSaving(false);
    }
  };

  // ─── Principal unlock override ─────────────────────────────────────────
  const handleUnlock = async () => {
    if (!currentUser) return;
    await createUnlockOverride(selectedHouse, selectedDate, currentUser.id);
    setUnlocked(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

        {/* House selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            House
          </label>
          <div className="flex gap-2 flex-wrap">
            {availableHouses.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHouse(h.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  selectedHouse === h.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={selectedHouse === h.id ? { backgroundColor: h.color, borderColor: h.color } : {}}
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* Session selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Session
          </label>
          <div className="flex gap-2">
            {SESSIONS.map((s) => (
              <button
                key={s.type}
                onClick={() => setSelectedSession(s.type as Session)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  selectedSession === s.type
                    ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                    : 'border-gray-200 text-gray-600 hover:border-[#1a3a5c]/30'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            max={todayStr()}
            onChange={(e) => { setSelectedDate(e.target.value); setUnlocked(false); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
          />
        </div>
      </div>

      {/* ── Locked banner ────────────────────────────────────────────── */}
      {isDateLocked && (
        <div className="flex items-center justify-between bg-gray-800 text-white px-5 py-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Lock size={18} className="shrink-0" />
            <div>
              <p className="font-semibold text-sm">Past date — attendance locked</p>
              <p className="text-xs text-gray-400">Only Principals can unlock past records.</p>
            </div>
          </div>
          {role === 'PRINCIPAL' && (
            <button
              onClick={handleUnlock}
              className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all"
            >
              <Unlock size={14} /> Request Unlock
            </button>
          )}
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
          />
        </div>

        {/* Mark all present */}
        <button
          onClick={markAllPresent}
          disabled={isDateLocked || loading}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <CheckSquare size={15} /> Mark All Present
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isDateLocked || saving}
          className="flex items-center gap-2 bg-[#1a3a5c] hover:bg-[#152e4d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          Save
        </button>
      </div>

      {/* ── Roll call list ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
          <RefreshCw className="animate-spin" size={20} />
          Loading students…
        </div>
      ) : (
        <RollCallList
          students={filteredStudents}
          records={records}
          onMark={handleMark}
          isLocked={isDateLocked}
          isPrincipal={role === 'PRINCIPAL'}
        />
      )}
    </div>
  );
}
