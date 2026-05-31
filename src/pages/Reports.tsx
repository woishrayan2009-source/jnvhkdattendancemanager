import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  FileBarChart, Filter, Download, FileText, FileSpreadsheet,
  RefreshCw, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { HOUSES } from '../lib/supabase';
import {
  ReportType,
  generateDailyAbsentee,
  generateMonthlyAttendance,
  generateLongAbsence,
  exportPDF,
  exportCSV,
  AbsenteeRow,
  MonthlyRow,
  LongAbsenceRow,
} from '../services/ReportService';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const REPORT_TYPES: { value: ReportType; label: string; desc: string; icon: string }[] = [
  { value: 'daily_absentee',    label: 'Daily Absentee',    desc: 'List of absent/unmarked students for a specific date',  icon: '📋' },
  { value: 'monthly_attendance',label: 'Monthly Attendance', desc: 'Per-student attendance % across a date range',           icon: '📊' },
  { value: 'long_absence',      label: 'Long Absence',       desc: 'Students absent 3+ consecutive days',                    icon: '⚠️' },
];

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] bg-white transition-colors';

// ─── Table renderers ────────────────────────────────────────────────────────
const AbsenteeTable: React.FC<{ rows: AbsenteeRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#1a3a5c] text-white text-xs">
          {['#', 'Roll No', 'Name', 'House', 'Status'].map(h => (
            <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
            <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.rollNumber}</td>
            <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
            <td className="px-3 py-2 text-gray-600">{r.houseName}</td>
            <td className="px-3 py-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                r.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>{r.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MonthlyTable: React.FC<{ rows: MonthlyRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#1a3a5c] text-white text-xs">
          {['Name', 'House', 'Days', 'Present', 'Absent', 'On Leave', 'Attendance %'].map(h => (
            <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
            <td className="px-3 py-2 text-gray-600">{r.houseName}</td>
            <td className="px-3 py-2 text-gray-500">{r.totalDays}</td>
            <td className="px-3 py-2 text-emerald-700 font-semibold">{r.presentDays}</td>
            <td className="px-3 py-2 text-red-600 font-semibold">{r.absentDays}</td>
            <td className="px-3 py-2 text-amber-600">{r.leaveDays}</td>
            <td className="px-3 py-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                r.attendancePct < 75 ? 'bg-red-100 text-red-700'
                : r.attendancePct < 85 ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
              }`}>{r.attendancePct}%</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LongAbsenceTable: React.FC<{ rows: LongAbsenceRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#1a3a5c] text-white text-xs">
          {['Name', 'House', 'Consecutive Days Absent', 'From', 'To'].map(h => (
            <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
            <td className="px-3 py-2 text-gray-600">{r.houseName}</td>
            <td className="px-3 py-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                r.consecutiveAbsent >= 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>{r.consecutiveAbsent} days</span>
            </td>
            <td className="px-3 py-2 text-gray-600">{format(new Date(r.from), 'dd MMM yyyy')}</td>
            <td className="px-3 py-2 text-gray-600">{format(new Date(r.to),   'dd MMM yyyy')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main page ──────────────────────────────────────────────────────────────
export default function Reports() {
  const { role, assignedHouseIds } = useAuth();
  const isHM = role === 'HM';

  const [reportType,  setReportType]  = useState<ReportType>('daily_absentee');
  const [fromDate,    setFromDate]    = useState(todayStr());
  const [toDate,      setToDate]      = useState(todayStr());
  const [houseId,     setHouseId]     = useState(isHM ? (assignedHouseIds[0] ?? '') : '');
  const [data,        setData]        = useState<AbsenteeRow[] | MonthlyRow[] | LongAbsenceRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [generated,   setGenerated]   = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hid = houseId || undefined;
      let result: AbsenteeRow[] | MonthlyRow[] | LongAbsenceRow[];
      if (reportType === 'daily_absentee')     result = await generateDailyAbsentee(fromDate, hid);
      else if (reportType === 'monthly_attendance') result = await generateMonthlyAttendance(fromDate, toDate, hid);
      else                                     result = await generateLongAbsence(fromDate, toDate, hid);
      setData(result);
      setGenerated(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [reportType, fromDate, toDate, houseId]);

  const handleExportPDF = () => exportPDF(reportType, data as any, { fromDate, toDate });
  const handleExportCSV = () => exportCSV(reportType, data as any, { fromDate });

  const showToDate = reportType !== 'daily_absentee';
  const currentType = REPORT_TYPES.find(t => t.value === reportType)!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reports & Export</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate attendance reports as PDF or CSV</p>
      </div>

      {/* ── Report type selector ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REPORT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => { setReportType(t.value); setGenerated(false); setData([]); }}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              reportType === t.value
                ? 'border-[#1a3a5c] bg-[#1a3a5c]/5'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="text-2xl mb-2">{t.icon}</div>
            <p className={`font-semibold text-sm ${reportType === t.value ? 'text-[#1a3a5c]' : 'text-gray-800'}`}>
              {t.label}
            </p>
            <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-700 text-sm">Filters</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className={showToDate ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {showToDate ? 'From Date' : 'Date'}
            </label>
            <input type="date" value={fromDate} max={todayStr()} onChange={e => setFromDate(e.target.value)} className={inputCls} />
          </div>
          {showToDate && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
              <input type="date" value={toDate} min={fromDate} max={todayStr()} onChange={e => setToDate(e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">House</label>
            <select value={houseId} onChange={e => setHouseId(e.target.value)} className={inputCls} disabled={isHM}>
              {!isHM && <option value="">All Houses</option>}
              {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a3a5c] hover:bg-[#152e4d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
        >
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            : <><FileBarChart size={14} /> Generate Report</>
          }
        </button>
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {generated && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-gray-800">{currentType.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.length} record{data.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {data.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  <FileSpreadsheet size={13} /> CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-[#1a3a5c] hover:bg-[#152e4d] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  <FileText size={13} /> PDF
                </button>
              </div>
            )}
          </div>

          {data.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileBarChart size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No data found for the selected filters.</p>
            </div>
          ) : (
            reportType === 'daily_absentee'     ? <AbsenteeTable     rows={data as AbsenteeRow[]}  /> :
            reportType === 'monthly_attendance' ? <MonthlyTable      rows={data as MonthlyRow[]}   /> :
                                                  <LongAbsenceTable  rows={data as LongAbsenceRow[]}/>
          )}
        </div>
      )}
    </div>
  );
}
