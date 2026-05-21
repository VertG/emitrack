'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Animated counter ──────────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const from = value
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
      else setValue(target)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return value
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TrendPoint = { label: string; date: string; emisi: number; hemat: number }

type CityRow = {
  kota: string
  users: number
  totalEmisi: number
  totalHemat: number
  tripHijau: number
  efisiensi: number
}

// ── Day labels ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab',
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="h-7 w-8 bg-gray-100 rounded mb-3" />
      <div className="h-3 bg-gray-100 rounded w-28 mb-3" />
      <div className="h-7 bg-gray-100 rounded w-20 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-14" />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, unit, color,
}: {
  icon: string; label: string; value: string; unit: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-xs text-gray-400 mb-1 leading-tight">{label}</div>
      <div className="text-2xl font-bold leading-none" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{unit}</div>
    </div>
  )
}

function ImpactCard({
  icon, label, value, unit, desc,
}: {
  icon: string; label: string; value: string; unit: string; desc: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-3xl font-bold text-[#1D9E75] mb-1">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{unit}</div>
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      <div className="text-[10px] text-gray-400">{desc}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublikPage() {
  const [loading, setLoading] = useState(true)

  const [totalUsers, setTotalUsers] = useState(0)
  const [totalHematTon, setTotalHematTon] = useState(0)
  const [totalTripHijau, setTotalTripHijau] = useState(0)
  const [rataEmisiHariIni, setRataEmisiHariIni] = useState(0)

  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [cityData, setCityData] = useState<CityRow[]>([])

  // Animated counters
  const animUsers = useAnimatedCounter(totalUsers)
  const animHemat = useAnimatedCounter(totalHematTon)
  const animTrip = useAnimatedCounter(totalTripHijau)
  const animRata = useAnimatedCounter(rataEmisiHariIni)

  // Environmental impact derived values
  const totalHematKg = totalHematTon * 1000
  const animPohon = useAnimatedCounter(totalHematTon * 47.6)
  const animKm = useAnimatedCounter(totalHematKg / 0.12)
  const animLiter = useAnimatedCounter(totalHematKg / 2.31)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)

    // 1. Total users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 2. Total CO₂ dihemat (dari profiles)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('total_hemat')

    const totalHematKgRaw = profilesData?.reduce(
      (sum, p) => sum + (p.total_hemat ?? 0), 0
    ) ?? 0

    // 3. Total trip hijau
    const { count: tripHijauCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('jenis', 'transportasi_umum')

    // 4. Rata-rata emisi hari ini
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: tripsHariIni } = await supabase
      .from('trips')
      .select('emisi_kg, user_id')
      .gte('created_at', todayStart.toISOString())

    let rataEmisi = 0
    if (tripsHariIni && tripsHariIni.length > 0) {
      const totalEmisiToday = tripsHariIni.reduce((s, t) => s + (t.emisi_kg ?? 0), 0)
      const uniqueUsers = new Set(tripsHariIni.map(t => t.user_id)).size
      rataEmisi = uniqueUsers > 0 ? totalEmisiToday / uniqueUsers : 0
    }

    // 5. 7-day trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: recentTrips } = await supabase
      .from('trips')
      .select('emisi_kg, emisi_dihemat, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    const trendMap: Record<string, { emisi: number; hemat: number }> = {}
    const days: TrendPoint[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trendMap[key] = { emisi: 0, hemat: 0 }
      days.push({ date: key, label: DAY_LABELS[d.getDay()], emisi: 0, hemat: 0 })
    }

    recentTrips?.forEach(t => {
      const key = (t.created_at as string).split('T')[0]
      if (trendMap[key]) {
        trendMap[key].emisi += t.emisi_kg ?? 0
        trendMap[key].hemat += t.emisi_dihemat ?? 0
      }
    })

    const finalTrend = days.map(d => ({
      ...d,
      emisi: Number((trendMap[d.date]?.emisi ?? 0).toFixed(2)),
      hemat: Number((trendMap[d.date]?.hemat ?? 0).toFixed(2)),
    }))

    // 6. City comparison — join trips → profiles(kota)
    const { data: allTrips } = await supabase
      .from('trips')
      .select('emisi_kg, emisi_dihemat, jenis, user_id, profiles(kota)')

    const cityMap: Record<string, {
      users: Set<string>; totalEmisi: number; totalHemat: number; tripHijau: number
    }> = {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allTrips?.forEach((t: any) => {
      const kota: string = t.profiles?.kota ?? 'Tidak Diketahui'
      if (!cityMap[kota]) cityMap[kota] = { users: new Set(), totalEmisi: 0, totalHemat: 0, tripHijau: 0 }
      cityMap[kota].users.add(t.user_id)
      cityMap[kota].totalEmisi += t.emisi_kg ?? 0
      cityMap[kota].totalHemat += t.emisi_dihemat ?? 0
      if (t.jenis === 'transportasi_umum') cityMap[kota].tripHijau += 1
    })

    const cityRows: CityRow[] = Object.entries(cityMap)
      .map(([kota, d]) => ({
        kota,
        users: d.users.size,
        totalEmisi: Number(d.totalEmisi.toFixed(2)),
        totalHemat: Number(d.totalHemat.toFixed(2)),
        tripHijau: d.tripHijau,
        efisiensi: d.totalEmisi > 0
          ? Number((d.totalHemat / d.totalEmisi * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.totalHemat - a.totalHemat)
      .slice(0, 10)

    setTotalUsers(userCount ?? 0)
    setTotalHematTon(Number((totalHematKgRaw / 1000).toFixed(3)))
    setTotalTripHijau(tripHijauCount ?? 0)
    setRataEmisiHariIni(Number(rataEmisi.toFixed(3)))
    setTrendData(finalTrend)
    setCityData(cityRows)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="text-[#1D9E75] text-lg font-bold leading-none">EmiTrack</div>
            <div className="text-gray-400 text-[9px] tracking-widest">JEJAK EMISIMU</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-[#E1F5EE] text-[#085041] text-xs font-semibold px-3 py-1.5 rounded-full">
            <span>📊</span> Dashboard Publik
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[#1D9E75] hover:text-[#085041] transition-colors"
          >
            Masuk →
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Dashboard Emisi Kota
          </h1>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Data emisi CO₂ kendaraan bermotor dan penghematan karbon masyarakat secara real-time.
            Digunakan untuk mendukung kebijakan transportasi berkelanjutan.
          </p>
        </div>

        {/* ── HERO STAT CARDS ────────────────────────────────────────────────── */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon="👤"
                label="Pengguna Aktif"
                value={Math.round(animUsers).toLocaleString('id-ID')}
                unit="pengguna"
                color="#1D9E75"
              />
              <StatCard
                icon="🌿"
                label="Total CO₂ Dihemat"
                value={animHemat.toFixed(2)}
                unit="ton CO₂"
                color="#085041"
              />
              <StatCard
                icon="🚌"
                label="Trip Hijau"
                value={Math.round(animTrip).toLocaleString('id-ID')}
                unit="perjalanan"
                color="#1D9E75"
              />
              <StatCard
                icon="📈"
                label="Rata Emisi/User Hari Ini"
                value={animRata.toFixed(2)}
                unit="kg CO₂/user"
                color="#E24B4A"
              />
            </div>
          )}
        </section>

        {/* ── TREND CHART ────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-5">
            <div className="text-sm font-bold text-gray-800">
              Tren Emisi &amp; Penghematan 7 Hari Terakhir
            </div>
            <div className="text-xs text-gray-400 mt-0.5">kg CO₂ per hari — seluruh pengguna</div>
          </div>
          {loading ? (
            <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} kg`,
                    name === 'emisi' ? 'Emisi Dihasilkan' : 'CO₂ Dihemat',
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => value === 'emisi' ? 'Emisi Dihasilkan' : 'CO₂ Dihemat'}
                />
                <Line
                  type="monotone"
                  dataKey="emisi"
                  stroke="#E24B4A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#E24B4A' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="hemat"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#1D9E75' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ── CITY TABLE ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-sm font-bold text-gray-800">Perbandingan Emisi per Kota</div>
            <div className="text-xs text-gray-400 mt-0.5">Top 10 kota berdasarkan total CO₂ dihemat</div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : cityData.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-sm">Belum ada data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1D9E75] text-white">
                    <th className="text-left px-4 py-3 font-semibold text-xs">Kota</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">User</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs hidden md:table-cell">
                      Emisi (kg)
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">CO₂ Dihemat (kg)</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs hidden md:table-cell">
                      Trip Hijau
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Efisiensi</th>
                  </tr>
                </thead>
                <tbody>
                  {cityData.map((row, i) => (
                    <tr key={row.kota} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {i === 0 && <span className="mr-1.5">🏆</span>}
                        {row.kota}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.users}</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                        {row.totalEmisi.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1D9E75]">
                        {row.totalHemat.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                        {row.tripHijau}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.efisiensi >= 50
                            ? 'bg-[#E1F5EE] text-[#085041]'
                            : row.efisiensi >= 20
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-600'
                        }`}>
                          {row.efisiensi}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── ENVIRONMENTAL IMPACT ───────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-6">
            <div className="text-base font-bold text-gray-800">Dampak Lingkungan</div>
            <div className="text-xs text-gray-400 mt-1">
              Berdasarkan total CO₂ yang berhasil dihemat seluruh pengguna
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ImpactCard
                icon="🌳"
                label="Setara Pohon Diselamatkan"
                value={Math.round(animPohon).toLocaleString('id-ID')}
                unit="pohon"
                desc="1 pohon menyerap ±21 kg CO₂/tahun (× 47.6 per ton)"
              />
              <ImpactCard
                icon="🚗"
                label="Setara Jarak Tidak Berkendara"
                value={Math.round(animKm).toLocaleString('id-ID')}
                unit="km"
                desc="Berdasarkan emisi mobil rata-rata 0.12 kg CO₂/km"
              />
              <ImpactCard
                icon="⛽"
                label="Setara BBM Dihemat"
                value={Math.round(animLiter).toLocaleString('id-ID')}
                unit="liter"
                desc="Berdasarkan faktor emisi Pertalite 2.31 kg CO₂/liter"
              />
            </div>
          )}
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 mt-16 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center space-y-1.5">
          <div className="text-xs text-gray-400">
            Data diperbarui secara realtime · Sumber: EmiTrack Platform
          </div>
          <div className="text-xs text-gray-400">
            Mendukung SDG 11 — Kota dan Permukiman Berkelanjutan
          </div>
          <div className="text-xs text-gray-300 mt-2">© 2026 EmiTrack</div>
        </div>
      </footer>

    </div>
  )
}
