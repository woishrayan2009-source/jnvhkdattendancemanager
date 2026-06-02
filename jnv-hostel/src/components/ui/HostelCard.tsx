import type { CSSProperties } from 'react'
import { HOUSE_MAP } from '@/constants/houses'
import type { HouseId, HostelConfigEntry } from '@/constants/houses'
import type { HouseAttendanceSummary } from '@/services/reports'

interface HostelCardProps {
  hostel: HostelConfigEntry
  stats?: HouseAttendanceSummary
}

export default function HostelCard({ hostel, stats }: HostelCardProps) {
  const total = stats?.totalStudents ?? 0
  const present = stats?.present ?? 0
  const onLeave = stats?.onLeave ?? 0
  const absent = stats?.unexplainedAbsent ?? 0
  const effective = stats?.effective ?? 0
  const presentPct = total ? Math.round((present / total) * 100) : 0
  const leavePct = total ? Math.round((onLeave / total) * 100) : 0
  const absentPct = total ? Math.round((absent / total) * 100) : 0
  const houseColors = hostel.houses.map((houseId: HouseId) => HOUSE_MAP[houseId].color)

  const borderStyle: CSSProperties = hostel.houses.length > 1
    ? { borderTopWidth: 4, borderTopStyle: 'solid', borderImage: `linear-gradient(90deg, ${houseColors.join(', ')}) 1` }
    : { borderTopWidth: 4, borderTopStyle: 'solid', borderColor: houseColors[0] }

  return (
    <article
      key={hostel.id}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
      style={borderStyle}
      aria-label={hostel.name}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <div className="flex items-center gap-1">
                {hostel.houses.map((houseId) => (
                  <span
                    key={houseId}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: HOUSE_MAP[houseId].color }}
                  />
                ))}
              </div>
              <span>{hostel.name}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {hostel.description ?? hostel.classes.join(', ')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{effective}/{total} effective</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Total</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{total}</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">Present</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-900">{present}</p>
            <p className="text-sm text-emerald-700 mt-1">{presentPct}%</p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-700">On Leave</p>
            <p className="mt-3 text-3xl font-semibold text-amber-900">{onLeave}</p>
            <p className="text-sm text-amber-700 mt-1">{leavePct}%</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Unexplained Absent</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{absent}</p>
            <p className="text-sm text-slate-500 mt-1">{absentPct}%</p>
          </div>
        </div>

        {total === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Not configured
          </div>
        ) : effective === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Pending — no data recorded
          </div>
        ) : null}
      </div>
    </article>
  )
}
