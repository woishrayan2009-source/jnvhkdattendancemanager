import { clsx } from 'clsx'
import type { AttendanceStatus } from '@/constants/sessions'
import type { LeaveStatus } from '@/types'

type BadgeVariant = AttendanceStatus | LeaveStatus | 'default' | 'info'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  present:            'bg-green-50  text-green-700  border-green-200',
  absent:             'bg-red-50    text-red-700    border-red-200',
  leave:              'bg-amber-50  text-amber-700  border-amber-200',
  sickbay:            'bg-purple-50 text-purple-700 border-purple-200',
  duty:               'bg-cyan-50   text-cyan-700   border-cyan-200',
  pending:            'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved_hm:        'bg-blue-50   text-blue-700   border-blue-200',
  approved_principal: 'bg-green-50  text-green-700  border-green-200',
  rejected:           'bg-red-50    text-red-700    border-red-200',
  cancelled:          'bg-slate-50  text-slate-600  border-slate-200',
  default:            'bg-slate-50  text-slate-600  border-slate-200',
  info:               'bg-blue-50   text-blue-700   border-blue-200',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'status-pill border',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
