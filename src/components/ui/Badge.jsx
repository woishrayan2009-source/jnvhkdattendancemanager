import React from 'react'

const VARIANTS = {
  present: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  absent:  'bg-red-100 text-red-800 border border-red-200',
  leave:   'bg-amber-100 text-amber-800 border border-amber-200',
  HL:      'bg-sky-100 text-sky-800 border border-sky-200',
  ML:      'bg-purple-100 text-purple-800 border border-purple-200',
  CL:      'bg-orange-100 text-orange-800 border border-orange-200',
  SA:      'bg-gray-100 text-gray-800 border border-gray-200',
  OD:      'bg-indigo-100 text-indigo-800 border border-indigo-200',
  morning: 'bg-orange-100 text-orange-800 border border-orange-200',
  evening: 'bg-sky-100 text-sky-800 border border-sky-200',
  night:   'bg-indigo-100 text-indigo-800 border border-indigo-200',
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  online:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  offline: 'bg-red-100 text-red-700 border border-red-200',
}

export function Badge({ variant = 'default', children, className = '' }) {
  const cls = VARIANTS[variant] || VARIANTS.default
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, leaveType }) {
  if (status === 'leave' && leaveType) {
    return <Badge variant={leaveType}>{leaveType}</Badge>
  }
  const labels = { present: 'Present', absent: 'Absent', leave: 'Leave' }
  return <Badge variant={status}>{labels[status] || status}</Badge>
}
