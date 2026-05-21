"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const from = 0
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
      else setValue(target)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, inView]) // eslint-disable-line react-hooks/exhaustive-deps

  return { value, ref }
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

const DAY_LABELS: Record<number, string> = {
  0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab',
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, signInWithGoogle } = useAuth()

  const [loading, setLoading] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

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
  const animPohon = useAnimatedCounter(totalHematKg > 0 ? (totalHematTon * 47.6) : 0)
  const animKm = useAnimatedCounter(totalHematKg > 0 ? (totalHematKg / 0.12) : 0)
  const animLiter = useAnimatedCounter(totalHematKg > 0 ? (totalHematKg / 2.31) : 0)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    
    // 1. Total users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 2. Total CO₂ dihemat
    const { data: profilesData } = await supabase.from('profiles').select('total_hemat')
    const totalHematKgRaw = profilesData?.reduce((sum, p) => sum + (p.total_hemat ?? 0), 0) ?? 0

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

    // 6. City comparison
    const { data: allTrips } = await supabase
      .from('trips')
      .select('emisi_kg, emisi_dihemat, jenis, user_id, profiles(kota)')

    const cityMap: Record<string, { users: Set<string>; totalEmisi: number; totalHemat: number; tripHijau: number }> = {}

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
        efisiensi: d.totalEmisi > 0 ? Number((d.totalHemat / d.totalEmisi * 100).toFixed(1)) : 0,
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

  const scrollToStats = () => {
    document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image 
                src="/EmiTrackLogo1.png" 
                alt="EmiTrack" 
                width={130} 
                height={42} 
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/edukasi" className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors py-2 px-3 rounded-lg border border-transparent hover:border-gray-200 hidden md:block">
                📚 Edukasi
              </Link>
              {user ? (
                <Link href="/dashboard" className="bg-[#1D9E75] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#085041] transition-colors shadow-sm">
                  📊 Dashboard Saya →
                </Link>
              ) : (
                <button onClick={() => setIsLoginModalOpen(true)} className="bg-[#1D9E75] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#085041] transition-colors shadow-sm">
                  🌿 Mulai Lacak Emisi
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#085041] to-[#0F6E56] text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Image 
            src="/EmiTrackLogo2.png" 
            alt="EmiTrack" 
            width={280} 
            height={160} 
            className="object-contain mx-auto mb-6"
          />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-6 border border-amber-500/30">
            <span>🏆 INNOVATE CodeUp 2026 · SDG 11</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            Lacak Emisi CO₂mu. Kurangi Jejak Karbon. Menangkan Tantangan.
          </h1>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Platform pelacak emisi kendaraan berbasis gamifikasi untuk mendorong mobilitas perkotaan berkelanjutan di Indonesia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!user && (
              <button onClick={() => setIsLoginModalOpen(true)} className="w-full sm:w-auto bg-white text-[#085041] text-base font-bold px-8 py-4 rounded-full hover:bg-gray-50 transition-colors shadow-lg">
                🌿 Mulai Lacak Emisi
              </button>
            )}
            <button onClick={scrollToStats} className="w-full sm:w-auto bg-transparent border-2 border-white/30 text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-colors">
              📊 Lihat Data Kota
            </button>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-60">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
      </section>

      {/* 3. STATS LIVE */}
      <section id="stats-section" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Data Realtime Platform EmiTrack</h2>
            <p className="text-gray-500">Agregasi kontribusi seluruh pengguna dalam menurunkan emisi perkotaan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div ref={animUsers.ref} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
              <div className="text-4xl mb-4">👥</div>
              <div className="text-4xl font-black text-[#1D9E75] mb-1">{Math.round(animUsers.value).toLocaleString('id-ID')}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pengguna Aktif</div>
            </div>
            <div ref={animHemat.ref} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
              <div className="text-4xl mb-4">🌿</div>
              <div className="text-4xl font-black text-[#085041] mb-1">{animHemat.value.toFixed(2)}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ton CO₂ Dihemat</div>
            </div>
            <div ref={animTrip.ref} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
              <div className="text-4xl mb-4">🚌</div>
              <div className="text-4xl font-black text-[#1D9E75] mb-1">{Math.round(animTrip.value).toLocaleString('id-ID')}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Trip Hijau</div>
            </div>
            <div ref={animRata.ref} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 text-center shadow-sm">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-4xl font-black text-[#E24B4A] mb-1">{animRata.value.toFixed(2)}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rata Emisi/User/Hari (kg)</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GRAFIK TREN & 5. TABEL KOTA */}
      <section className="bg-gray-50 py-20 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* GRAFIK TREN */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Tren Emisi & Penghematan</h3>
                <p className="text-sm text-gray-500 mt-1">7 Hari Terakhir (kg CO₂)</p>
              </div>
              {loading ? (
                <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Line type="monotone" name="Emisi Dihasilkan" dataKey="emisi" stroke="#E24B4A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="CO₂ Dihemat" dataKey="hemat" stroke="#1D9E75" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* TABEL KOTA */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Perbandingan Emisi per Kota</h3>
                <p className="text-sm text-gray-500 mt-1">Peringkat kota berdasarkan reduksi karbon</p>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="text-left py-3 font-semibold">Kota</th>
                      <th className="text-right py-3 font-semibold">Pengguna</th>
                      <th className="text-right py-3 font-semibold hidden sm:table-cell">Emisi (kg)</th>
                      <th className="text-right py-3 font-semibold text-[#1D9E75]">Hemat (kg)</th>
                      <th className="text-right py-3 font-semibold">Efisiensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={5} className="py-3"><div className="h-6 bg-gray-50 rounded animate-pulse" /></td></tr>
                      ))
                    ) : cityData.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-400">Belum ada data</td></tr>
                    ) : (
                      cityData.map((row, i) => (
                        <tr key={row.kota} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 font-medium text-gray-900 flex items-center gap-2">
                            {i === 0 && <span>🏆</span>}
                            {row.kota}
                          </td>
                          <td className="py-3 text-right text-gray-600">{row.users}</td>
                          <td className="py-3 text-right text-gray-600 hidden sm:table-cell">{row.totalEmisi.toLocaleString('id-ID')}</td>
                          <td className="py-3 text-right font-bold text-[#1D9E75]">{row.totalHemat.toLocaleString('id-ID')}</td>
                          <td className="py-3 text-right">
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-bold ${
                              row.efisiensi >= 50 ? 'bg-[#E1F5EE] text-[#085041]' : row.efisiensi >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {row.efisiensi}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DAMPAK LINGKUNGAN */}
      <section className="bg-[#E1F5EE] py-20 border-y border-[#9FE1CB]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#085041] mb-12">Dampak Nyata EmiTrack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div ref={animPohon.ref} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-6xl mb-6">🌳</div>
              <div className="text-gray-500 font-medium mb-2 uppercase tracking-wide text-sm">Setara</div>
              <div className="text-4xl font-black text-[#1D9E75] mb-2">{Math.round(animPohon.value).toLocaleString('id-ID')}</div>
              <div className="text-gray-800 font-bold text-lg">Pohon Diselamatkan</div>
            </div>
            <div ref={animKm.ref} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-6xl mb-6">🚗</div>
              <div className="text-gray-500 font-medium mb-2 uppercase tracking-wide text-sm">Setara</div>
              <div className="text-4xl font-black text-[#1D9E75] mb-2">{Math.round(animKm.value).toLocaleString('id-ID')}</div>
              <div className="text-gray-800 font-bold text-lg">Km Tidak Berkendara</div>
            </div>
            <div ref={animLiter.ref} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-6xl mb-6">⛽</div>
              <div className="text-gray-500 font-medium mb-2 uppercase tracking-wide text-sm">Setara</div>
              <div className="text-4xl font-black text-[#1D9E75] mb-2">{Math.round(animLiter.value).toLocaleString('id-ID')}</div>
              <div className="text-gray-800 font-bold text-lg">Liter BBM Dihemat</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FITUR HIGHLIGHTS */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Mengapa EmiTrack?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Fitur komprehensif untuk membantu Anda dan pemerintah kota melacak, memahami, dan mengurangi jejak emisi karbon.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🧮', title: 'Kalkulator Emisi Lokal', desc: 'Berbasis RON + data IPCC & ESDM RI. Berlaku untuk semua merek BBM.' },
              { icon: '🏆', title: 'Gamifikasi & Leaderboard', desc: 'Kumpulkan poin, raih badge, bersaing dengan pengguna sekota.' },
              { icon: '🗺️', title: 'Rute Alternatif Real', desc: 'Peta Leaflet + OSRM routing — rute jalan sesungguhnya.' },
              { icon: '📊', title: 'Data Publik untuk Pemda', desc: 'Data agregat emisi kota terbuka untuk pemangku kebijakan.' },
              { icon: '📚', title: 'Edukasi Emisi', desc: 'Pahami RON, rumus kalkulasi, dan tips kurangi emisi.' },
              { icon: '🔥', title: 'Streak & Badge', desc: 'Motivasi harian dengan sistem streak dan pencapaian.' }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-[#9FE1CB] hover:bg-[#E1F5EE]/30 transition-colors group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="bg-[#085041] py-20 text-center text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Mulai lacak emisimu hari ini</h2>
          <p className="text-[#E1F5EE] opacity-90 mb-8 text-lg">Bergabung dengan pengguna EmiTrack dan berkontribusi pada kota yang lebih hijau</p>
          {!user ? (
            <button onClick={() => setIsLoginModalOpen(true)} className="bg-white text-[#085041] hover:bg-gray-100 transition-colors text-lg font-bold px-8 py-4 rounded-full shadow-xl flex items-center justify-center gap-3 mx-auto">
              🌿 Daftar dengan Google — Gratis
            </button>
          ) : (
            <Link href="/dashboard" className="bg-white text-[#085041] hover:bg-gray-100 transition-colors text-lg font-bold px-8 py-4 rounded-full shadow-xl inline-flex items-center justify-center gap-3 mx-auto">
              📊 Lanjut ke Dashboard
            </Link>
          )}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-[#9FE1CB] opacity-80">
            <span>Mendukung SDG 11</span>
            <span>•</span>
            <span>Data aman</span>
            <span>•</span>
            <span>Gratis selamanya</span>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-[#0a2e1f] py-12 border-t border-[#1D9E75]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start mb-2">
              <Image 
                src="/EmiTrackLogo1.png" 
                alt="EmiTrack" 
                width={100} 
                height={32} 
                className="object-contain brightness-0 invert"
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300 font-medium">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/kalkulator" className="hover:text-white transition-colors">Kalkulator</Link>
            <Link href="/peta" className="hover:text-white transition-colors">Peta</Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/edukasi" className="hover:text-white transition-colors">Edukasi</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <div>© 2026 EmiTrack · INNOVATE CodeUp · SDG 11</div>
          <div>Data diperbarui realtime · Sumber: IPCC 2021 + ESDM RI</div>
        </div>
      </footer>

      {/* 10. MODAL LOGIN */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsLoginModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors">
              ✕
            </button>
            
            <div className="flex justify-center mb-4">
              <Image src="/EmiTrackLogo2.png" alt="EmiTrack" width={200} height={120} className="object-contain mx-auto" />
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Masuk ke EmiTrack</h3>
              <p className="text-gray-500 text-sm">Mulai lacak jejak karbon harianmu</p>
            </div>
            
            <button
              onClick={() => {
                signInWithGoogle()
                // Modal stay open until redirect happens via AuthContext standard flow, 
                // but since it's an external redirect, the page will unload.
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-200 active:scale-[0.98] transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Lanjutkan dengan Google
            </button>
            
            <p className="text-center text-[10px] text-gray-400 mt-6 leading-relaxed">
              Dengan masuk, kamu menyetujui penggunaan data<br/>untuk tujuan pelestarian lingkungan kota.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
