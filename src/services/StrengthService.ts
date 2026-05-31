import { db } from '../db/schema';
import { format, parseISO, isAfter } from 'date-fns';
import { HOUSES } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface HouseStrength {
  houseId: string;
  houseName: string;
  houseColor: string;
  total: number;
  present: number;
  onLeave: number;
  absent: number;
  effectiveStrength: number;   // total − onLeave − absent (students physically present)
}

export interface SchoolStrength {
  date: string;
  totals: { total: number; present: number; onLeave: number; absent: number };
  byHouse: HouseStrength[];
}

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
  type: 'OVERDUE_RETURN' | 'SESSION_MISSING' | 'ABSENCE_SPIKE';
  severity: AlertSeverity;
  message: string;
  meta?: Record<string, unknown>;
}

// ─── Core: strength for one house on a date ─────────────────────────────────
export async function getStrengthForHouse(houseId: string, date: string): Promise<HouseStrength> {
  const houseInfo = HOUSES.find(h => h.id === houseId);

  // All students in house
  const students = await db.students.where('house_id').equals(houseId).toArray();
  const total = students.length;
  const studentIds = students.map(s => s.id);

  if (total === 0) {
    return {
      houseId, houseName: houseInfo?.name ?? 'Unknown', houseColor: houseInfo?.color ?? '#888',
      total: 0, present: 0, onLeave: 0, absent: 0, effectiveStrength: 0,
    };
  }

  // Attendance records for date
  const records = await db.attendance_records
    .where('date').equals(date)
    .filter(r => studentIds.includes(r.student_id))
    .toArray();

  const recordMap = new Map(records.map(r => [r.student_id, r.status]));

  // Approved leave for date
  const leavesToday = await db.leave_requests
    .filter(l =>
      l.status === 'APPROVED' &&
      studentIds.includes(l.student_id) &&
      l.start_date <= date &&
      l.end_date >= date
    )
    .toArray();
  const onLeaveIds = new Set(leavesToday.map(l => l.student_id));

  let present = 0, onLeave = 0, absent = 0;

  for (const sid of studentIds) {
    if (onLeaveIds.has(sid)) {
      onLeave++;
    } else {
      const status = recordMap.get(sid);
      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'ON_LEAVE') onLeave++;
      else present++; // no record yet = optimistically count as present
    }
  }

  return {
    houseId,
    houseName: houseInfo?.name ?? 'Unknown',
    houseColor: houseInfo?.color ?? '#888',
    total,
    present,
    onLeave,
    absent,
    effectiveStrength: total - onLeave - absent,
  };
}

// ─── School-wide strength ───────────────────────────────────────────────────
export async function getSchoolStrength(date: string): Promise<SchoolStrength> {
  const byHouse: HouseStrength[] = await Promise.all(
    HOUSES.map(h => getStrengthForHouse(h.id, date))
  );

  const totals = byHouse.reduce(
    (acc, h) => ({
      total:   acc.total   + h.total,
      present: acc.present + h.present,
      onLeave: acc.onLeave + h.onLeave,
      absent:  acc.absent  + h.absent,
    }),
    { total: 0, present: 0, onLeave: 0, absent: 0 }
  );

  return { date, totals, byHouse };
}

// ─── Alerts ─────────────────────────────────────────────────────────────────
export async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const now   = new Date();

  // 1. Overdue returns
  const overdue = await db.leave_requests
    .filter(l =>
      l.status === 'APPROVED' &&
      l.end_date < today &&
      l.actual_return_time === null
    )
    .toArray();

  for (const l of overdue) {
    const student = await db.students.get(l.student_id);
    alerts.push({
      type: 'OVERDUE_RETURN',
      severity: 'HIGH',
      message: `${student?.name ?? 'Unknown student'} — overdue since ${format(parseISO(l.end_date), 'dd MMM')}`,
      meta: { leaveId: l.id, studentId: l.student_id },
    });
  }

  // 2. Session not submitted by expected time
  // Morning = should be done by 08:00, Evening by 18:00, Night by 22:00
  const sessionCutoffs: { session: string; icon: string; cutoffHour: number; cutoffMin: number }[] = [
    { session: 'Morning', icon: '🌅', cutoffHour: 8,  cutoffMin: 0  },
    { session: 'Evening', icon: '🌤️', cutoffHour: 18, cutoffMin: 0  },
    { session: 'Night',   icon: '🌙', cutoffHour: 22, cutoffMin: 0  },
  ];

  for (const { session, icon, cutoffHour, cutoffMin } of sessionCutoffs) {
    const cutoff = new Date();
    cutoff.setHours(cutoffHour, cutoffMin, 0, 0);
    if (!isAfter(now, cutoff)) continue; // cutoff not reached yet

    // Check if any house has attendance records for today's session
    for (const house of HOUSES) {
      const students = await db.students.where('house_id').equals(house.id).toArray();
      if (students.length === 0) continue;

      const studentIds = students.map(s => s.id);
      const recordCount = await db.attendance_records
        .where('date').equals(today)
        .filter(r => studentIds.includes(r.student_id))
        .count();

      if (recordCount === 0) {
        alerts.push({
          type: 'SESSION_MISSING',
          severity: 'MEDIUM',
          message: `${house.name}: ${icon} ${session} roll-call not submitted`,
          meta: { houseId: house.id, session },
        });
      }
    }
  }

  // 3. Unusual absence spike (>10% absent in a house)
  const strength = await getSchoolStrength(today);
  for (const h of strength.byHouse) {
    if (h.total === 0) continue;
    const absentPct = (h.absent / h.total) * 100;
    if (absentPct > 10) {
      alerts.push({
        type: 'ABSENCE_SPIKE',
        severity: absentPct > 25 ? 'HIGH' : 'MEDIUM',
        message: `${h.houseName}: ${Math.round(absentPct)}% students absent today (${h.absent}/${h.total})`,
        meta: { houseId: h.houseId, absentPct },
      });
    }
  }

  // Sort: HIGH first
  const order: Record<AlertSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
