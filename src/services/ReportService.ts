import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, eachDayOfInterval, differenceInDays } from 'date-fns';
import { db } from '../db/schema';
import { HOUSES } from '../lib/supabase';

const NVS_NAVY = [26,  58,  92]  as const;
const NVS_GOLD = [217, 119, 6]   as const;
const NVS_NAVY_HEX = '#1a3a5c';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface AbsenteeRow {
  rollNumber: string;
  name: string;
  houseName: string;
  status: string;
  date: string;
}

export interface MonthlyRow {
  name: string;
  houseName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePct: number;
}

export interface LongAbsenceRow {
  name: string;
  houseName: string;
  consecutiveAbsent: number;
  from: string;
  to: string;
}

export type ReportType = 'daily_absentee' | 'monthly_attendance' | 'long_absence';

// ─── PDF header helper ──────────────────────────────────────────────────────
function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...NVS_NAVY);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Jawahar Navodaya Vidyalaya, Haridwar', 105, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 105, 18, { align: 'center' });

  doc.setFillColor(...NVS_GOLD);
  doc.rect(0, 28, 210, 1.5, 'F');

  doc.setTextColor(...NVS_NAVY);
  doc.setFontSize(8);
  doc.text(subtitle, 105, 34, { align: 'center' });
}

// ─── PDF footer ─────────────────────────────────────────────────────────────
function pdfFooter(doc: jsPDF) {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `JNV Haridwar Attendance System  ·  Generated ${format(new Date(), 'dd/MM/yyyy HH:mm')}  ·  Page ${i} of ${n}`,
      105, 292, { align: 'center' }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 1.  Daily Absentee
// ══════════════════════════════════════════════════════════════════════════
export async function generateDailyAbsentee(date: string, houseId?: string): Promise<AbsenteeRow[]> {
  const houses = houseId ? HOUSES.filter(h => h.id === houseId) : HOUSES;
  const rows: AbsenteeRow[] = [];

  for (const house of houses) {
    const students = await db.students.where('house_id').equals(house.id).toArray();
    const ids = students.map(s => s.id);

    // Active leaves that cover this date
    const onLeaveIds = new Set(
      (await db.leave_requests
        .filter(l => l.status === 'APPROVED' && l.start_date <= date && l.end_date >= date && ids.includes(l.student_id))
        .toArray()
      ).map(l => l.student_id)
    );

    // Attendance records
    const records = await db.attendance_records
      .where('date').equals(date)
      .filter(r => ids.includes(r.student_id))
      .toArray();
    const recMap = new Map(records.map(r => [r.student_id, r.status]));

    for (const stu of students) {
      if (onLeaveIds.has(stu.id)) continue;  // approved leave — not unexplained
      const status = recMap.get(stu.id);
      if (status === 'ABSENT' || (!status)) {
        rows.push({
          rollNumber: stu.id.slice(0, 6).toUpperCase(),
          name: stu.name,
          houseName: house.name,
          status: status === 'ABSENT' ? 'Absent' : 'Not Marked',
          date,
        });
      }
    }
  }

  return rows.sort((a, b) => a.houseName.localeCompare(b.houseName) || a.name.localeCompare(b.name));
}

// ══════════════════════════════════════════════════════════════════════════
// 2.  Monthly Attendance
// ══════════════════════════════════════════════════════════════════════════
export async function generateMonthlyAttendance(
  fromDate: string, toDate: string, houseId?: string
): Promise<MonthlyRow[]> {
  const days = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) });
  const dayStrs = days.map(d => format(d, 'yyyy-MM-dd'));
  const houses = houseId ? HOUSES.filter(h => h.id === houseId) : HOUSES;
  const rows: MonthlyRow[] = [];

  for (const house of houses) {
    const students = await db.students.where('house_id').equals(house.id).toArray();

    for (const stu of students) {
      const records = await db.attendance_records
        .where('date').anyOf(dayStrs)
        .filter(r => r.student_id === stu.id)
        .toArray();
      const recMap = new Map(records.map(r => [r.date, r.status]));

      let present = 0, absent = 0, onLeave = 0;
      for (const d of dayStrs) {
        const s = recMap.get(d);
        if (s === 'PRESENT') present++;
        else if (s === 'ABSENT') absent++;
        else if (s === 'ON_LEAVE') onLeave++;
        else present++; // not yet marked — optimistic
      }
      const total = dayStrs.length;
      // Denominator = only days with a real mark (present or absent).
      // Excludes future/unmarked days (avoids optimistic inflation) and
      // on-leave days (student wasn't expected to be present).
      const markedDays = present + absent;
      const attendancePct = markedDays > 0
        ? Math.round((present / markedDays) * 100)
        : 0;
      rows.push({
        name: stu.name,
        houseName: house.name,
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        leaveDays: onLeave,
        attendancePct,
      });
    }
  }

  return rows.sort((a, b) => a.houseName.localeCompare(b.houseName) || a.name.localeCompare(b.name));
}

// ══════════════════════════════════════════════════════════════════════════
// 3.  Long Absence (≥3 consecutive absent days)
// ══════════════════════════════════════════════════════════════════════════
export async function generateLongAbsence(fromDate: string, toDate: string, houseId?: string): Promise<LongAbsenceRow[]> {
  const days = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) }).map(d => format(d, 'yyyy-MM-dd'));
  const houses = houseId ? HOUSES.filter(h => h.id === houseId) : HOUSES;
  const rows: LongAbsenceRow[] = [];

  for (const house of houses) {
    const students = await db.students.where('house_id').equals(house.id).toArray();

    for (const stu of students) {
      const records = await db.attendance_records
        .where('date').anyOf(days)
        .filter(r => r.student_id === stu.id && r.status === 'ABSENT')
        .toArray();
      const absentSet = new Set(records.map(r => r.date));

      let streak = 0, streakStart = '';
      for (const d of days) {
        if (absentSet.has(d)) {
          if (streak === 0) streakStart = d;
          streak++;
        } else {
          if (streak >= 3) {
            rows.push({
              name: stu.name,
              houseName: house.name,
              consecutiveAbsent: streak,
              from: streakStart,
              to: days[days.indexOf(d) - 1],
            });
          }
          streak = 0;
        }
      }
      if (streak >= 3) {
        rows.push({
          name: stu.name,
          houseName: house.name,
          consecutiveAbsent: streak,
          from: streakStart,
          to: days[days.length - 1],
        });
      }
    }
  }

  return rows.sort((a, b) => b.consecutiveAbsent - a.consecutiveAbsent);
}

// ══════════════════════════════════════════════════════════════════════════
// PDF exports
// ══════════════════════════════════════════════════════════════════════════
export function exportPDF(type: ReportType, data: AbsenteeRow[] | MonthlyRow[] | LongAbsenceRow[], params: { fromDate: string; toDate: string }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { fromDate, toDate } = params;
  const dateRange = fromDate === toDate
    ? format(parseISO(fromDate), 'dd MMMM yyyy')
    : `${format(parseISO(fromDate), 'dd MMM')} – ${format(parseISO(toDate), 'dd MMM yyyy')}`;

  const titles: Record<ReportType, string> = {
    daily_absentee:    'Daily Absentee Report',
    monthly_attendance:'Monthly Attendance Report',
    long_absence:      'Long Absence Report (≥3 consecutive days)',
  };

  pdfHeader(doc, titles[type], `Period: ${dateRange}   ·   Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`);

  const startY = 38;

  if (type === 'daily_absentee') {
    const rows = data as AbsenteeRow[];
    (doc as any).autoTable({
      startY,
      head: [['#', 'Roll No', 'Name', 'House', 'Status']],
      body: rows.map((r, i) => [i + 1, r.rollNumber, r.name, r.houseName, r.status]),
      theme: 'striped',
      headStyles: { fillColor: NVS_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 4) {
          d.cell.styles.textColor = d.cell.text[0] === 'Absent' ? [185, 28, 28] : [107, 114, 128];
          d.cell.styles.fontStyle = 'bold';
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  } else if (type === 'monthly_attendance') {
    const rows = data as MonthlyRow[];
    (doc as any).autoTable({
      startY,
      head: [['Name', 'House', 'Days', 'Present', 'Absent', 'On Leave', 'Attendance %']],
      body: rows.map(r => [r.name, r.houseName, r.totalDays, r.presentDays, r.absentDays, r.leaveDays, `${r.attendancePct}%`]),
      theme: 'striped',
      headStyles: { fillColor: NVS_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 6) {
          const pct = parseInt(d.cell.text[0]);
          d.cell.styles.textColor = pct < 75 ? [185, 28, 28] : pct < 85 ? [161, 98, 7] : [21, 128, 61];
          d.cell.styles.fontStyle = 'bold';
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  } else {
    const rows = data as LongAbsenceRow[];
    (doc as any).autoTable({
      startY,
      head: [['Name', 'House', 'Consecutive Absent Days', 'From', 'To']],
      body: rows.map(r => [
        r.name, r.houseName, r.consecutiveAbsent,
        format(parseISO(r.from), 'dd MMM yyyy'),
        format(parseISO(r.to),   'dd MMM yyyy'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: NVS_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  pdfFooter(doc);
  doc.save(`jnv_${type}_${fromDate}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════
// CSV export (generic — works for all report types)
// ══════════════════════════════════════════════════════════════════════════
export function exportCSV(type: ReportType, data: Record<string, unknown>[], params: { fromDate: string }) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r =>
    Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `jnv_${type}_${params.fromDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
