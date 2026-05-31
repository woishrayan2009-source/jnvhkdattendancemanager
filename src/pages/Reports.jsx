import React, { useState } from 'react'
import { format } from 'date-fns'
import { FileBarChart, Filter } from 'lucide-react'
import { ExportButtons } from '../components/reports/ExportButtons'
import { Button } from '../components/ui/Button'
import { HOUSES, SESSIONS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Reports() {
  const { role, assignedHouseIds } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [filters, setFilters] = useState({
    date:        today,
    houseId:     role === 'HM' ? (assignedHouseIds[0] ?? '') : '',
    sessionType: '',
  })

  const update = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 w-full'

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1a3a5c]">Reports & Export</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate daily attendance reports as PDF or CSV</p>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-[#1a3a5c]" />
          <h3 className="font-semibold text-[#1a3a5c]">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={e => update('date', e.target.value)}
              max={today}
              className={inputCls}
            />
          </div>

          {role !== 'HM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">House</label>
              <select value={filters.houseId} onChange={e => update('houseId', e.target.value)} className={inputCls}>
                <option value="">All Houses</option>
                {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Session</label>
            <select value={filters.sessionType} onChange={e => update('sessionType', e.target.value)} className={inputCls}>
              <option value="">All Sessions</option>
              {SESSIONS.map(s => <option key={s.type} value={s.type}>{s.icon} {s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons
            date={filters.date}
            houseId={filters.houseId || null}
            sessionType={filters.sessionType || null}
          />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Daily Report',   desc: 'Attendance for a specific date and session',     icon: '📋', tag: 'Available' },
          { title: 'Monthly Report', desc: 'Month-wise summary per house and class',           icon: '📊', tag: 'Phase 2' },
          { title: 'Yearly Report',  desc: 'Annual attendance percentage per student',         icon: '📈', tag: 'Phase 2' },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">{card.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                card.tag === 'Available'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>{card.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
