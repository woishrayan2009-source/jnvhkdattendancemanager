import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error', 6000),
    warning: (msg) => addToast(msg, 'warning'),
    info:    (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS = {
  success: <CheckCircle className="text-emerald-500" size={18} />,
  error:   <XCircle    className="text-red-500"     size={18} />,
  warning: <AlertTriangle className="text-amber-500" size={18} />,
  info:    <Info       className="text-sky-500"     size={18} />,
}

const BORDERS = {
  success: 'border-l-4 border-emerald-500',
  error:   'border-l-4 border-red-500',
  warning: 'border-l-4 border-amber-500',
  info:    'border-l-4 border-sky-500',
}

function ToastItem({ toast, onRemove }) {
  return (
    <div className={`flex items-start gap-3 bg-white rounded-lg shadow-lg p-4 ${BORDERS[toast.type]} animate-in slide-in-from-right duration-300`}>
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
