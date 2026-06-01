import React, { useRef } from 'react';
import * as ReactWindow from 'react-window';
const { FixedSizeList } = ReactWindow;
import type { ListChildComponentProps } from 'react-window';
import { Student } from '../../db/schema';
import { AttendanceStatus } from '../../services/AttendanceService';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

type RecordMap = Record<string, AttendanceStatus>;

interface RollCallListProps {
  students: Student[];
  records: RecordMap;
  onMark: (studentId: string, status: AttendanceStatus) => void;
  isLocked: boolean;
  isPrincipal: boolean;
}

const STATUS_CYCLE: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'ON_LEAVE'];

const STATUS_CONFIG = {
  PRESENT: {
    label: 'Present',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    btn: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm',
  },
  ABSENT: {
    label: 'Absent',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: XCircle,
    iconColor: 'text-red-600',
    btn: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  },
  ON_LEAVE: {
    label: 'On Leave',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: Clock,
    iconColor: 'text-amber-600',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
  },
};

const ROW_HEIGHT = 72;

interface RowData {
  students: Student[];
  records: RecordMap;
  onMark: (studentId: string, status: AttendanceStatus) => void;
  isLocked: boolean;
}

const StudentRowItem = React.memo(({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { students, records, onMark, isLocked } = data;
  const student = students[index];
  const status: AttendanceStatus = records[student.id] || 'PRESENT';
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const handleCycle = () => {
    if (isLocked) return;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
    onMark(student.id, next);
  };

  return (
    <div style={style} className="px-4 py-1">
      <div
        className={`flex items-center gap-3 h-full px-4 rounded-xl border transition-all ${cfg.bg} ${isLocked ? 'opacity-60' : ''}`}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 text-gray-500 font-semibold text-sm select-none">
          {student.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
          <p className="text-xs text-gray-400">ID: {student.id.slice(0, 8)}</p>
        </div>

        {/* Status badge */}
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.badge}`}>
          <Icon size={12} className={cfg.iconColor} />
          {cfg.label}
        </span>

        {/* Toggle button */}
        <button
          onClick={handleCycle}
          disabled={isLocked}
          aria-label={`Toggle status for ${student.name}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${cfg.btn} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Mark
        </button>
      </div>
    </div>
  );
});

StudentRowItem.displayName = 'StudentRowItem';

export const RollCallList: React.FC<RollCallListProps> = ({
  students,
  records,
  onMark,
  isLocked,
  isPrincipal,
}) => {
  const listRef = useRef<FixedSizeList>(null);

  const itemData: RowData = { students, records, onMark, isLocked };

  const summary = Object.values(records).reduce(
    (acc, s) => {
      const key = s.toLowerCase() as 'present' | 'absent' | 'on_leave';
      const map: Record<string, keyof typeof acc> = { present: 'present', absent: 'absent', on_leave: 'leave' };
      acc[map[key] ?? 'present']++;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ['Total', students.length, 'bg-gray-50 text-gray-700'],
          ['Present', summary.present, 'bg-emerald-50 text-emerald-700'],
          ['Absent', summary.absent, 'bg-red-50 text-red-700'],
          ['On Leave', summary.leave, 'bg-amber-50 text-amber-700'],
        ].map(([label, count, cls]) => (
          <div key={label as string} className={`rounded-xl p-3 text-center ${cls}`}>
            <p className="text-2xl font-bold leading-none">{count}</p>
            <p className="text-xs font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 min-h-0" style={{ height: '55vh' }}>
        {students.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No students found.
          </div>
        ) : (
          <FixedSizeList
            ref={listRef}
            height={Math.min(students.length * ROW_HEIGHT, window.innerHeight * 0.6)}
            itemCount={students.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            itemData={itemData}
            overscanCount={5}
          >
            {StudentRowItem}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
};
