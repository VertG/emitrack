'use client'

import { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'info' | 'warning'

export interface ToastItem {
  id: string
  msg: string
  type: ToastType
}

// Global toast manager (singleton-style)
type ToastListener = (toasts: ToastItem[]) => void
let _toasts: ToastItem[] = []
const _listeners: Set<ToastListener> = new Set()

function notify() {
  _listeners.forEach(l => l([..._toasts]))
}

export function showToast(msg: string, type: ToastType = 'success', duration = 3000) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  _toasts = [..._toasts, { id, msg, type }]
  notify()
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id)
    notify()
  }, duration)
}

// ── Style maps ────────────────────────────────────────────────────────────────
const BG: Record<ToastType, string> = {
  success: 'bg-[#1D9E75]',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
}
const BORDER: Record<ToastType, string> = {
  success: 'border-[#0F6E56]',
  info: 'border-blue-600',
  warning: 'border-amber-600',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: ToastListener = (t) => setToasts(t)
    _listeners.add(listener)
    return () => { _listeners.delete(listener) }
  }, [])

  const dismiss = useCallback((id: string) => {
    _toasts = _toasts.filter(t => t.id !== id)
    notify()
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl
            border ${BG[t.type]} ${BORDER[t.type]}
            pointer-events-auto
            animate-[slideInRight_0.25s_ease-out]
            max-w-xs
          `}
          style={{
            animation: 'slideInRight 0.25s ease-out',
          }}
        >
          <span className="flex-1">{t.msg}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-white/70 hover:text-white transition-colors ml-1 text-xs"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Keyframe animation injected globally once */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
