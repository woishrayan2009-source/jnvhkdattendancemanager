import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Sun, CloudSun, Moon, CheckSquare,
  Clock, AlertCircle, ArrowRight, Phone, CalendarCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db, LeaveRequest, Student } from '../db/schema';
import { StrengthCard } from '../components/StrengthCard';
import { getStrengthForHouse } from '../services/StrengthService';
import { getPendingLeaves, getTodaysLeaves } from '../services/LeaveService';
import { HOUSES } from '../lib/supabase';
import { HouseStrength } from '../services/StrengthService';

interface TodayLeave extends LeaveRequest { studentName: string; }

const today = () => format(new Date(), 'yyyy-MM-dd');

const QuickAction: React.FC<{
  icon: React.ReactNode; label: string; sub: string;
  color: string; onClick: () => void;
}> = ({ icon, label, sub, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 p-4 rounded-2xl text-white w-full text-left transition-all hover:opacity-90 active:scale-[0.98] shadow-sm ${color}`}
  >
    <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-white/70">{sub}</p>
    </div>
    <ArrowRight size={16} className="shrink-0 opacity-70" />
  </button>
);

export default function HMDashboard() {
  const { currentUser, assignedHouseIds } = useAuth();
  const navigate = useNavigate();

  const primaryHouseId = assignedHouseIds[0] ?? null;
  const houseInfo = HOUSES.find(h => h.id === primaryHouseId);

  const [strength,  setStrength]  = useState<HouseStrength | null>(null);
  const [todayLeaves, setTodayLeaves] = useState<TodayLeave[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!primaryHouseId) return;
    setLoading(true);
    try {
      const [str, leaves, pending] = await Promise.all([
        getStrengthForHouse(primaryHouseId, today()),
        getTodaysLeaves(primaryHouseId),
        getPendingLeaves('HM', assignedHouseIds),
      ]);
      setStrength(str);
      setPendingCount(pending.length);

      // Enrich leave with student names
      const enriched = await Promise.all(
        leaves.map(async l => {
          const s = await db.students.get(l.student_id);
          return { ...l, studentName: s?.name ?? 'Unknown' };
        })
      );
      setTodayLeaves(enriched);
    } finally {
      setLoading(false);
    }
  }, [primaryHouseId, assignedHouseIds]);

  useEffect(() => { load(); }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0f2440] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">{greeting()}, {currentUser?.name?.split(' ')[0]}!</p>
            <h2 className="text-2xl font-black mt-1">
              {houseInfo?.name ?? 'Your'} House
            </h2>
            <p className="text-white/50 text-xs mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: houseInfo?.color ?? '#888' }} />
            </div>
          </div>
        </div>

        {/* Pending badge */}
        {pendingCount > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="text-amber-300 shrink-0" />
            <p className="text-xs text-amber-200 font-medium">
              {pendingCount} leave request{pendingCount > 1 ? 's' : ''} awaiting your approval
            </p>
            <button
              onClick={() => navigate('/leave-approval')}
              className="ml-auto text-xs text-amber-300 underline font-semibold"
            >
              Review
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
          <RefreshCw className="animate-spin" size={20} />
          Loading house data…
        </div>
      ) : (
        <>
          {/* ── Strength card ─────────────────────────────────────── */}
          {strength && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-700">Today's Strength</h2>
                <button
                  onClick={load}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <StrengthCard {...strength} />
            </div>
          )}

          {/* ── Quick actions ─────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction
                icon={<Sun size={18} />}
                label="Take Morning Roll"
                sub="Mark morning attendance"
                color="bg-orange-500"
                onClick={() => navigate('/mark-attendance?session=morning')}
              />
              <QuickAction
                icon={<CloudSun size={18} />}
                label="Take Evening Roll"
                sub="Mark evening attendance"
                color="bg-sky-600"
                onClick={() => navigate('/mark-attendance?session=evening')}
              />
              <QuickAction
                icon={<Moon size={18} />}
                label="Take Night Roll"
                sub="Mark night attendance"
                color="bg-indigo-700"
                onClick={() => navigate('/mark-attendance?session=night')}
              />
              <QuickAction
                icon={<CheckSquare size={18} />}
                label={`Approve Leaves${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
                sub="Review leave requests for your house"
                color="bg-emerald-600"
                onClick={() => navigate('/leave-approval')}
              />
            </div>
          </div>

          {/* ── Today's leaves ────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <CalendarCheck size={15} className="text-amber-500" />
              Students on Leave Today
              <span className="ml-auto text-xs text-gray-400 font-normal">{todayLeaves.length} students</span>
            </h2>

            {todayLeaves.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl py-8 text-center text-gray-400 text-sm">
                No students on leave today.
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden max-h-64 overflow-y-auto">
                {todayLeaves.map(l => (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                      {l.studentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.studentName}</p>
                      <p className="text-xs text-gray-400">
                        Returns: {format(parseISO(l.end_date), 'dd MMM')} at {l.return_time}
                      </p>
                    </div>
                    <a
                      href={`tel:${l.guardian_phone}`}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
                      title={l.guardian_phone}
                    >
                      <Phone size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
