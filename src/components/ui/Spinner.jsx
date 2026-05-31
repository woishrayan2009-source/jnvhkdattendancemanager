import React from 'react'

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-2 border-[#1a3a5c]/20 border-t-[#1a3a5c] rounded-full animate-spin ${className}`} />
  )
}

export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500 animate-pulse">{message}</p>
    </div>
  )
}
