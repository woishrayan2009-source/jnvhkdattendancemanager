import { clsx } from 'clsx'

export function PageSpinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
      <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-800 rounded-full animate-spin mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function Spinner({ size = 'md', className }: { size?: 'sm'|'md'|'lg', className?: string }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-3' }[size]
  return (
    <span
      className={clsx('inline-block rounded-full border-current border-t-transparent animate-spin', s, className)}
      role="status"
      aria-label="Loading"
    />
  )
}
