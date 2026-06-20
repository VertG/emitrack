'use client'

import { Navigation, Square, Timer, Route, MapPin, Gauge, Trophy } from 'lucide-react'
import { formatDurasi } from '@/lib/gps'

export type NavigationOverlayProps = {
  jarakDitempuh: number    // km
  jarakRute: number        // km
  waktuDetik: number       // detik sejak mulai
  modaLabel: string        // "KRL Commuter", "Sepeda", etc.
  onSelesai: () => void
  onBatal: () => void
  isValidating?: boolean   // saat sedang validasi
}

export default function NavigationOverlay({
  jarakDitempuh,
  jarakRute,
  waktuDetik,
  modaLabel,
  onSelesai,
  onBatal,
  isValidating = false,
}: NavigationOverlayProps) {
  const persenProgress = jarakRute > 0 ? Math.min(100, Math.round((jarakDitempuh / jarakRute) * 100)) : 0
  const sisaKm = Math.max(0, jarakRute - jarakDitempuh)
  // Kecepatan rata-rata (km/jam)
  const kecepatanKmh = waktuDetik > 0 ? Number(((jarakDitempuh / waktuDetik) * 3600).toFixed(1)) : 0

  return (
    <>
      {/* ── Top Info Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="mx-3 mt-3 md:mx-4 md:mt-4 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center">
                  <Navigation size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Navigasi Aktif</div>
                  <div className="text-[10px] text-gray-400">{modaLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700">GPS Aktif</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium text-gray-500">Progress Perjalanan</span>
                <span className="text-[10px] font-bold text-[#1D9E75]">{persenProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1D9E75] to-[#34d399] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${persenProgress}%` }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <Route size={14} />, label: 'Ditempuh', value: `${jarakDitempuh.toFixed(1)}`, unit: 'km', color: 'text-[#1D9E75]' },
                { icon: <MapPin size={14} />, label: 'Sisa', value: `${sisaKm.toFixed(1)}`, unit: 'km', color: 'text-amber-600' },
                { icon: <Timer size={14} />, label: 'Waktu', value: formatDurasi(waktuDetik), unit: '', color: 'text-blue-600' },
                { icon: <Gauge size={14} />, label: 'Kecepatan', value: `${kecepatanKmh}`, unit: 'km/j', color: 'text-purple-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-2 text-center">
                  <div className="flex justify-center text-gray-400 mb-0.5">{stat.icon}</div>
                  <div className={`text-sm font-bold ${stat.color} leading-tight`}>{stat.value}</div>
                  <div className="text-[9px] text-gray-400">{stat.unit || stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Buttons ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="mx-3 mb-3 md:mx-4 md:mb-4 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-3">
            {/* Hint */}
            {persenProgress < 50 && (
              <div className="text-[10px] text-center text-gray-400 mb-2">
                Tempuh minimal 50% rute atau sampai dekat tujuan untuk menyelesaikan
              </div>
            )}
            {persenProgress >= 50 && (
              <div className="text-[10px] text-center text-[#1D9E75] font-medium mb-2 flex items-center justify-center gap-1">
                <Trophy size={12} /> Kamu sudah menempuh cukup jarak! Bisa klik Selesai.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onBatal}
                disabled={isValidating}
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Square size={14} fill="currentColor" />
                Batal
              </button>
              <button
                onClick={onSelesai}
                disabled={isValidating}
                className="flex-[2] py-3 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#0F6E56] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-[#1D9E75]/25"
              >
                {isValidating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memvalidasi...
                  </>
                ) : (
                  <>
                    <Navigation size={14} />
                    Selesai & Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
