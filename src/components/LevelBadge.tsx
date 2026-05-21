'use client'

import { getLevelByPoin, getLevelProgress } from '@/lib/level'
import { Sparkles } from 'lucide-react'

interface LevelBadgeProps {
  poin: number
  size?: 'sm' | 'md' | 'lg'
}

export default function LevelBadge({ poin, size = 'sm' }: LevelBadgeProps) {
  const { current: level, next, progress, poinToNext } = getLevelProgress(poin)
  const Icon = level.icon

  if (size === 'sm') {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
        style={{ background: level.warnaLight, color: level.warna }}
      >
        <span><Icon size={12} /></span>
        <span>{level.nama}</span>
      </div>
    )
  }

  if (size === 'md') {
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-sm"
          style={{ background: level.warnaLight, color: level.warna }}
        >
          <Icon size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: level.warna }}>
            {level.nama}
          </div>
          <div className="text-xs text-gray-400">Level {level.level}</div>
        </div>
      </div>
    )
  }

  // size === 'lg'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ background: level.warnaLight, color: level.warna }}
        >
          <Icon size={28} />
        </div>
        <div>
          <div className="text-lg font-bold flex items-center gap-1.5" style={{ color: level.warna }}>
            {level.nama}
          </div>
          <div className="text-sm text-gray-400">Level {level.level} · {poin.toLocaleString('id-ID')} poin</div>
          <div className="text-xs text-gray-400 mt-0.5">{level.deskripsi}</div>
        </div>
      </div>

      {/* Progress bar ke level berikutnya */}
      {next && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className="flex items-center gap-1">Progress ke {next.nama} <next.icon size={12} className="opacity-70" /></span>
            <span>{poinToNext.toLocaleString('id-ID')} poin lagi</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: level.warna }} 
            />
          </div>
          <div className="text-xs text-gray-300 mt-1">{next.minPoin.toLocaleString('id-ID')} poin</div>
        </div>
      )}

      {/* Sudah max level */}
      {!next && (
        <div className="text-center py-2 bg-purple-50 rounded-xl border border-purple-100">
          <div className="text-xs text-purple-600 font-medium flex items-center justify-center gap-1.5">
            <Sparkles size={14} /> Level Tertinggi Tercapai!
          </div>
        </div>
      )}
    </div>
  )
}
