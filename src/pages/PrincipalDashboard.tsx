import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  RefreshCw, AlertTriangle, AlertCircle, Info,
  Users, CheckCircle2, Clock, XCircle, ShieldAlert
} from 'lucide-react';
import { StrengthCard } from '../components/StrengthCard';
import { getSchoolStrength, getAlerts, SchoolStrength, Alert } from '../services/StrengthService';
import { HOUSES } from '../lib/supabase';

// JNV section structure: Sub-Junior | Girls | Junior Boys | Senior Boys
// Mapped by house name for demo. In production, houses would carry a 'section' tag.
const SECTIONS = [
  { label: 'Sub-Junior', houseNames: ['Nilgiri'] },
  { label: 'Girls',      houseNames: ['Arawali'] },
  { label: 'Junior Boys',houseNames: ['Shiwalik'] },
  { label: 'Senior Boys',houseNames: ['Udaygiri'] },
];

const ALERT_ICONS = {
  OVERDUE_RETURN: ShieldAlert,
  SESSION_MISSING: AlertCircle,
  ABSENCE_SPIKE:  AlertTriangle,
};
const ALERT_STYLES = {
  HIGH:   'bg-red-50 border-red-200 text-red-800',
  MEDIUM: 'bg-orange-50 border-orange-200 text-orange-800',
  LOW:    'bg-blue-50 border-blue-200 text-blue-700',
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const MetricCard: React.FC<{
  label: string; value: number; icon: React.ReactNode; colorCls: string;
}> = ({ label, value, icon, colorCls }) => (
  <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm ${colorCls}`}>
    <div className="opacity-80">{icon}</div>
    <div>
      <p className="text-3xl font-black leading-none">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </div>
  </div>
);

export default function PrincipalDashboard() {
  const [strength, setStrength]     = useState<SchoolStrength | null>(null);
  const [alerts,   setAlerts]       = useState<Alert[]>([]);
  const [activeTab, setActiveTab]   = useState(0);
  const [loading,   setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [str, alts] = await Promise.all([
        getSchoolStrength(todayStr()),
        getAlerts(),
      ]);
      setStrength(str);
      setAlerts(alts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const section = SECTIONS[activeTab];
  const sectionHouses = strength?.byHouse.filter(h =>
    section.houseNames.some(n => h.houseName.toLowerCase().includes(n.toLowerCase()))
  ) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Principal Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !strength ? (
        <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
          <RefreshCw className="animate-spin" size={22} />
          Calculating strength…
        </div>
      ) : (
        <>
          {/* ── Top metric cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Students"
              value={strength?.totals.total ?? 0}
              icon={<Users size={28} className="text-white" />}
              colorCls="bg-[#1a3a5c] text-white"
            />
            <MetricCard
              label="Present Today"
              value={strength?.totals.present ?? 0}
              icon={<CheckCircle2 size={28} className="text-white" />}
              colorCls="bg-emerald-600 text-white"
            />
            <MetricCard
              label="On Leave"
              value={strength?.totals.onLeave ?? 0}
              icon={<Clock size={28} className="text-white" />}
              colorCls="bg-amber-500 text-white"
            />
            <MetricCard
              label="Unexplained Absent"
              value={strength?.totals.absent ?? 0}
              icon={<XCircle size={28} className="text-white" />}
              colorCls={`${(strength?.totals.absent ?? 0) > 0 ? 'bg-red-600' : 'bg-gray-400'} text-white`}
            />
          </div>

          {/* ── Two-column layout: Tabs | Alerts ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Section tabs + house cards (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tab bar */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {SECTIONS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === i
                        ? 'bg-white text-[#1a3a5c] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* House cards for active section */}
              {sectionHouses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                  No data for this section yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sectionHouses.map(h => (
                    <StrengthCard key={h.houseId} {...h} />
                  ))}
                </div>
              )}

              {/* All-houses overview (compact) below tabs */}
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  All Houses — Quick View
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {(strength?.byHouse ?? []).map(h => (
                    <StrengthCard key={h.houseId} {...h} compact />
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts panel (1/3 width) */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Alerts
                {alerts.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </h2>

              {alerts.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-sm text-emerald-700 font-medium">All clear!</p>
                  <p className="text-xs text-emerald-500">No alerts at this time.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a, i) => {
                    const Icon = ALERT_ICONS[a.type];
                    return (
                      <div key={i} className={`flex items-start gap-2.5 px-3 py-3 rounded-xl border text-xs ${ALERT_STYLES[a.severity]}`}>
                        <Icon size={14} className="shrink-0 mt-0.5" />
                        <p className="leading-snug">{a.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
