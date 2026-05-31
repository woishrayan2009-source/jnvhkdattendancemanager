import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 focus-visible:ring-navy-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
  danger:    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500',
  warning:   'bg-amber-500 text-white hover:bg-amber-400 active:bg-amber-600 focus-visible:ring-amber-400',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8  px-3   text-xs  gap-1.5 rounded-lg',
  md: 'h-10 px-4   text-sm  gap-2   rounded-lg',
  lg: 'h-12 px-5   text-base gap-2  rounded-xl',
}

export function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold',
        'transition-colors duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
