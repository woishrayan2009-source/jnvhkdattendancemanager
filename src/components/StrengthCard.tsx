import React from 'react';
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { HouseStrength } from '../services/StrengthService';

interface StrengthCardProps extends HouseStrength {
  compact?: boolean;
}

export const StrengthCard: React.FC<StrengthCardProps> = ({
  houseName, houseColor, total, present, onLeave, absent, effectiveStrength, compact = false,
}) => {
  const presentPct = total > 0 ? Math.round((present  / total) * 100) : 0;
  const leavePct   = total > 0 ? Math.round((onLeave  / total) * 100) : 0;
  const absentPct  = total > 0 ? Math.round((absent   / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Colored top bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: houseColor }} />

      <div className="p-4">
        {/* House name */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: houseColor }} />
          <h3 className="font-bold text-gray-800 text-sm">{houseName}</h3>
          <span className="ml-auto text-xs text-gray-400 font-medium">
            {effectiveStrength}/{total} effective
          </span>
        </div>

        {/* Stats grid */}
        <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {/* Total */}
          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users size={13} className="text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-700 leading-none">{total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total</p>
          </div>

          {/* Present */}
          <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-emerald-700 leading-none">{present}</p>
            <p className="text-xs text-emerald-500 mt-0.5">{presentPct}%</p>
          </div>

          {/* On Leave */}
          <div className="bg-amber-50 rounded-xl p-2.5 text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock size={13} className="text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-700 leading-none">{onLeave}</p>
            <p className="text-xs text-amber-500 mt-0.5">{leavePct}%</p>
          </div>

          {/* Absent */}
          <div className={`rounded-xl p-2.5 text-center ${absent > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-center mb-1">
              <XCircle size={13} className={absent > 0 ? 'text-red-400' : 'text-gray-300'} />
            </div>
            <p className={`text-xl font-bold leading-none ${absent > 0 ? 'text-red-700' : 'text-gray-400'}`}>{absent}</p>
            <p className={`text-xs mt-0.5 ${absent > 0 ? 'text-red-400' : 'text-gray-400'}`}>{absentPct}%</p>
          </div>
        </div>

        {/* Stacked bar */}
        {!compact && total > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden flex bg-gray-100">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${presentPct}%` }} />
            <div className="bg-amber-400 h-full transition-all"  style={{ width: `${leavePct}%`   }} />
            <div className="bg-red-500 h-full transition-all"   style={{ width: `${absentPct}%`  }} />
          </div>
        )}
      </div>
    </div>
  );
};
