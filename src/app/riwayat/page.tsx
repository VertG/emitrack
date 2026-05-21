'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { SkeletonRow } from '@/components/Skeleton'

type Trip = {
  id: string
  jenis: string
  bbm: string
  jarak_km: number
  emisi_kg: number
  emisi_dihemat: number
  poin_didapat: number
  created_at: string
}

type FilterJenis = 'semua' | 'kendaraan' | 'umum'
type FilterPeriode = '7' | '30' | 'semua'
type SortBy = 'terbaru' | 'terlama' | 'emisi_besar' | 'emisi_kecil'

const MODA_LABEL: Record<string, string> = {
  motor: 'Motor',
  mobil: 'Mobil',
  transjakarta: 'TransJakarta',
  krl: 'KRL',
  sepeda: 'Sepeda',
  pertalite: 'Pertalite',
  pertamax: 'Pertamax',
  solar: 'Solar',
  listrik: 'Listrik (EV)',
}

const JENIS_ICON: Record<string, string> = {
  motor: '🏍️',
  mobil: '🚗',
  transportasi_umum: '🚌',
}

// Emission formula constants
const FAKTOR_EMISI: Record<string, number> = {
  pertalite: 2.31,
  pertamax: 2.35,
  solar: 2.67,
}
const KONSUMSI: Record<string, number> = {
  motor_pertalite: 0.043,
  motor_pertamax: 0.043,
  mobil_pertalite: 0.120,
  mobil_pertamax: 0.115,
  mobil_solar: 0.095,
}

const PAGE_SIZE = 10

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTimeFull(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

function getJenisLabel(trip: Trip) {
  if (trip.jenis === 'motor') return 'Motor Pribadi'
  if (trip.jenis === 'mobil') return 'Mobil Pribadi'
  return 'Transportasi Umum'
}

function getBbmLabel(trip: Trip) {
  return MODA_LABEL[trip.bbm] ?? trip.bbm
}

// ─────────────────────────────────────────────
// Modal Detail Trip
// ─────────────────────────────────────────────
function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const isKendaraan = trip.jenis === 'motor' || trip.jenis === 'mobil'
  const isUmum = trip.jenis === 'transportasi_umum'

  const fe = FAKTOR_EMISI[trip.bbm] ?? null
  const fk = KONSUMSI[`${trip.jenis}_${trip.bbm}`] ?? null

  const emisiMobil = Number((trip.emisi_kg + trip.emisi_dihemat).toFixed(3))
  const pohon = trip.emisi_dihemat > 0 ? Math.floor(trip.emisi_dihemat / 0.021) : 0

  // Bar comparison widths
  const maxVal = Math.max(trip.emisi_kg, emisiMobil, 0.001)
  const barUmum = Math.round((trip.emisi_kg / maxVal) * 100)
  const barMobil = Math.round((emisiMobil / maxVal) * 100)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg"
          >
            ✕
          </button>

          <div className="text-center">
            <div className="text-5xl mb-3">{JENIS_ICON[trip.jenis] ?? '🚗'}</div>
            <div className="text-base font-bold text-gray-800 mb-1">
              {getJenisLabel(trip)} — {getBbmLabel(trip)}
            </div>
            <div className="text-xs text-gray-400 mb-3">{formatDateTimeFull(trip.created_at)}</div>
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
              isKendaraan
                ? 'bg-red-50 text-red-600'
                : 'bg-[#E1F5EE] text-[#085041]'
            }`}>
              {isKendaraan ? 'Kendaraan Pribadi' : 'Transportasi Hijau 🌿'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Data Perjalanan */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Data Perjalanan</div>
            <div className="space-y-2">
              {[
                { label: 'Jarak Tempuh', val: `${trip.jarak_km} km` },
                { label: 'Jenis Kendaraan', val: getJenisLabel(trip) },
                { label: isUmum ? 'Moda Transit' : 'Bahan Bakar', val: getBbmLabel(trip) },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-medium text-gray-800">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kalkulasi Emisi */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Kalkulasi Emisi</div>
            {isKendaraan && fe && fk ? (
              <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 space-y-1">
                <div className="text-gray-400">E = D × FE × FK</div>
                <div>E = {trip.jarak_km} km × {fe} kg CO₂/L × {fk} L/km</div>
                <div className="font-bold text-[#1D9E75] text-sm pt-1">
                  E = {trip.emisi_kg} kg CO₂
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Emisi moda ini</span>
                  <span className="font-semibold text-[#1D9E75]">{trip.emisi_kg} kg CO₂</span>
                </div>
                {trip.emisi_dihemat > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Emisi jika naik mobil</span>
                    <span className="font-semibold text-red-500">{emisiMobil} kg CO₂</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dampak & Reward */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Dampak & Reward</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#E1F5EE] rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${trip.emisi_dihemat > 0 ? 'text-[#1D9E75]' : 'text-gray-400'}`}>
                  {trip.emisi_dihemat > 0 ? `${trip.emisi_dihemat.toFixed(2)}` : '—'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">kg CO₂ Dihemat</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-amber-500">+{trip.poin_didapat}</div>
                <div className="text-[10px] text-gray-500 mt-1">Poin Didapat</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${pohon > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {pohon > 0 ? pohon : '—'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Jam Pohon</div>
              </div>
            </div>
            {pohon > 0 && (
              <div className="text-[10px] text-gray-400 mt-2 text-center">
                ≈ {pohon} jam fotosintesis 1 pohon dewasa
              </div>
            )}
          </div>

          {/* Perbandingan (only if transportasi_umum) */}
          {isUmum && trip.emisi_dihemat > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Perbandingan vs Mobil</div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Moda ini: {trip.emisi_kg} kg CO₂</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D9E75] rounded-full transition-all"
                      style={{ width: `${barUmum}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Jika naik mobil: {emisiMobil} kg CO₂</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full transition-all"
                      style={{ width: `${barMobil}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-[#1D9E75] font-medium text-center">
                🌿 Kamu hemat {((1 - trip.emisi_kg / emisiMobil) * 100).toFixed(0)}% emisi dibanding naik mobil!
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center mb-4 leading-relaxed">
              Data ini tidak dapat diubah untuk menjaga akurasi laporan emisi.<br />
              ID: {trip.id.slice(0, 6).toUpperCase()}
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1D9E75] text-white text-sm font-medium rounded-xl hover:bg-[#0F6E56] transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function RiwayatPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [trips, setTrips] = useState<Trip[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [page, setPage] = useState(1)

  const [filterJenis, setFilterJenis] = useState<FilterJenis>('semua')
  const [filterPeriode, setFilterPeriode] = useState<FilterPeriode>('semua')
  const [sortBy, setSortBy] = useState<SortBy>('terbaru')

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    fetchTrips()
  }, [user])

  // Escape key closes modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedTrip(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function fetchTrips() {
    setDataLoading(true)
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (!error && data) setTrips(data)
    setDataLoading(false)
  }

  // Filter + Sort (all client-side)
  const filtered = useMemo(() => {
    let list = [...trips]

    if (filterJenis === 'kendaraan') {
      list = list.filter(t => t.jenis === 'motor' || t.jenis === 'mobil')
    } else if (filterJenis === 'umum') {
      list = list.filter(t => t.jenis === 'transportasi_umum')
    }

    if (filterPeriode !== 'semua') {
      const days = Number(filterPeriode)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      list = list.filter(t => new Date(t.created_at) >= cutoff)
    }

    if (sortBy === 'terbaru') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === 'terlama') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sortBy === 'emisi_besar') list.sort((a, b) => b.emisi_kg - a.emisi_kg)
    else if (sortBy === 'emisi_kecil') list.sort((a, b) => a.emisi_kg - b.emisi_kg)

    return list
  }, [trips, filterJenis, filterPeriode, sortBy])

  useEffect(() => { setPage(1) }, [filterJenis, filterPeriode, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalJarak = filtered.reduce((s, t) => s + t.jarak_km, 0)
  const totalEmisi = filtered.reduce((s, t) => s + t.emisi_kg, 0)
  const totalDihemat = filtered.reduce((s, t) => s + t.emisi_dihemat, 0)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="font-medium text-gray-800">Riwayat Perjalanan</div>
          <div className="text-xs text-gray-400">Total {trips.length} trip tercatat</div>
        </div>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5 flex-wrap">
              {([
                { val: 'semua', label: 'Semua' },
                { val: 'kendaraan', label: '🏍️ Kendaraan' },
                { val: 'umum', label: '🚌 Trans. Umum' },
              ] as { val: FilterJenis; label: string }[]).map(f => (
                <button
                  key={f.val}
                  onClick={() => setFilterJenis(f.val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterJenis === f.val
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200 hidden md:block" />

            <select
              value={filterPeriode}
              onChange={e => setFilterPeriode(e.target.value as FilterPeriode)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-[#1D9E75]"
            >
              <option value="7">7 Hari Terakhir</option>
              <option value="30">30 Hari Terakhir</option>
              <option value="semua">Semua Waktu</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-[#1D9E75]"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="emisi_besar">Emisi Terbesar</option>
              <option value="emisi_kecil">Emisi Terkecil</option>
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Trip', val: filtered.length.toString(), unit: 'perjalanan', color: 'text-gray-700' },
              { label: 'Total Jarak', val: totalJarak.toFixed(1), unit: 'km', color: 'text-amber-600' },
              { label: 'Total Emisi', val: totalEmisi.toFixed(2), unit: 'kg CO₂', color: 'text-red-500' },
              { label: 'Total Dihemat', val: totalDihemat.toFixed(2), unit: 'kg CO₂', color: 'text-[#1D9E75]' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                <div className={`text-xl font-semibold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.unit}</div>
              </div>
            ))}
          </div>

          {/* Trip List */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {dataLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4">🛣️</div>
                <div className="text-gray-500 font-medium mb-1">Belum ada perjalanan tercatat</div>
                <div className="text-gray-400 text-sm mb-5">Mulai catat perjalananmu untuk melihat dampak emisi</div>
                <Link href="/kalkulator"
                  className="px-5 py-2 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] transition-colors">
                  Mulai Catat →
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {paginated.map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[#E1F5EE]/40 transition-colors cursor-pointer group"
                    >
                      {/* Icon */}
                      <div className="text-2xl shrink-0">{JENIS_ICON[trip.jenis] ?? '🚗'}</div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {getJenisLabel(trip)} — {getBbmLabel(trip)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {trip.jarak_km} km · {formatDateTime(trip.created_at)}
                        </div>
                        <div className="text-[10px] text-[#1D9E75] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Lihat detail →
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          trip.jenis === 'transportasi_umum'
                            ? 'bg-[#E1F5EE] text-[#085041]'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {trip.emisi_kg} kg CO₂
                        </span>
                        {trip.emisi_dihemat > 0 && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E1F5EE] text-[#1D9E75]">
                            Hemat {trip.emisi_dihemat.toFixed(2)} kg
                          </span>
                        )}
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                          +{trip.poin_didapat} poin
                        </span>
                        {/* Chevron hint */}
                        <span className="text-gray-300 group-hover:text-[#1D9E75] transition-colors text-sm">›</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-gray-400">
                      Halaman <span className="font-medium text-gray-700">{page}</span> dari <span className="font-medium text-gray-700">{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </div>
  )
}
