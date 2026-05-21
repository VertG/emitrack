import React from 'react'

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white border border-gray-100 rounded-xl p-4 ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3 mt-3"></div>
    </div>
  )
}

export function SkeletonText({ width = 'w-full', className = '' }: { width?: string, className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 h-4 rounded ${width} ${className}`}></div>
  )
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${className}`}>
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="space-y-2 w-full max-w-[200px]">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-2 bg-gray-100 rounded w-2/3"></div>
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
  )
}

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-current ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}
