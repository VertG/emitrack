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
import { 
  Users, Leaf, Bus, TrendingDown, Car, Trophy, ChevronDown, Flame, BarChart2,
  TreePine, Fuel, Calculator, Map as MapIcon, ClipboardList, BookOpen, Check, X
} from 'lucide-react'
import { LEVELS } from '@/lib/level'

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setInView(true) },
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
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(0 + (target - 0) * eased)
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
  kota: string; users: number; totalEmisi: number
  totalHemat: number; tripHijau: number; efisiensi: number
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

  const animUsers = useAnimatedCounter(totalUsers)
  const animHemat = useAnimatedCounter(totalHematTon)
  const animTrip = useAnimatedCounter(totalTripHijau)
  const animRata = useAnimatedCounter(rataEmisiHariIni)

  const totalHematKg = totalHematTon * 1000
  const animPohon = useAnimatedCounter(totalHematKg > 0 ? (totalHematTon * 47.6) : 0)
  const animKm = useAnimatedCounter(totalHematKg > 0 ? (totalHematKg / 0.12) : 0)
  const animLiter = useAnimatedCounter(totalHematKg > 0 ? (totalHematKg / 2.31) : 0)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { data: profilesData } = await supabase.from('profiles').select('total_hemat')
    const totalHematKgRaw = profilesData?.reduce((sum, p) => sum + (p.total_hemat ?? 0), 0) ?? 0
    const { count: tripHijauCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('jenis', 'transportasi_umum')
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data: tripsHariIni } = await supabase.from('trips').select('emisi_kg, user_id').gte('created_at', todayStart.toISOString())
    let rataEmisi = 0
    if (tripsHariIni && tripsHariIni.length > 0) {
      const totalEmisiToday = tripsHariIni.reduce((s, t) => s + (t.emisi_kg ?? 0), 0)
      const uniqueUsers = new Set(tripsHariIni.map(t => t.user_id)).size
      rataEmisi = uniqueUsers > 0 ? totalEmisiToday / uniqueUsers : 0
    }
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0)
    const { data: recentTrips } = await supabase.from('trips').select('emisi_kg, emisi_dihemat, created_at').gte('created_at', sevenDaysAgo.toISOString())
    const trendMap: Record<string, { emisi: number; hemat: number }> = {}
    const days: TrendPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trendMap[key] = { emisi: 0, hemat: 0 }
      days.push({ date: key, label: DAY_LABELS[d.getDay()], emisi: 0, hemat: 0 })
    }
    recentTrips?.forEach(t => {
      const key = (t.created_at as string).split('T')[0]
      if (trendMap[key]) { trendMap[key].emisi += t.emisi_kg ?? 0; trendMap[key].hemat += t.emisi_dihemat ?? 0 }
    })
    const finalTrend = days.map(d => ({ ...d, emisi: Number((trendMap[d.date]?.emisi ?? 0).toFixed(2)), hemat: Number((trendMap[d.date]?.hemat ?? 0).toFixed(2)) }))
    const { data: allTrips } = await supabase.from('trips').select('emisi_kg, emisi_dihemat, jenis, user_id, profiles(kota)')
    const cityMap: Record<string, { users: Set<string>; totalEmisi: number; totalHemat: number; tripHijau: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allTrips?.forEach((t: any) => {
      const kota: string = t.profiles?.kota ?? 'Tidak Diketahui'
      if (!cityMap[kota]) cityMap[kota] = { users: new Set(), totalEmisi: 0, totalHemat: 0, tripHijau: 0 }
      cityMap[kota].users.add(t.user_id); cityMap[kota].totalEmisi += t.emisi_kg ?? 0; cityMap[kota].totalHemat += t.emisi_dihemat ?? 0
      if (t.jenis === 'transportasi_umum') cityMap[kota].tripHijau += 1
    })
    const cityRows: CityRow[] = Object.entries(cityMap).map(([kota, d]) => ({
      kota, users: d.users.size, totalEmisi: Number(d.totalEmisi.toFixed(2)), totalHemat: Number(d.totalHemat.toFixed(2)),
      tripHijau: d.tripHijau, efisiensi: d.totalEmisi > 0 ? Number((d.totalHemat / d.totalEmisi * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.totalHemat - a.totalHemat).slice(0, 10)
    setTotalUsers(userCount ?? 0); setTotalHematTon(Number((totalHematKgRaw / 1000).toFixed(3)))
    setTotalTripHijau(tripHijauCount ?? 0); setRataEmisiHariIni(Number(rataEmisi.toFixed(3)))
    setTrendData(finalTrend); setCityData(cityRows); setLoading(false)
  }

  const scrollToStats = () => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-white">

      {/* ═══ 1. NAVBAR ═══════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Image src="/EmiTrackLogo1.png" alt="EmiTrack" width={130} height={42} className="object-contain" />
          <div className="flex items-center gap-4">
            <Link href="/edukasi" className="text-sm text-gray-500 hover:text-[#1D9E75] transition-colors hidden md:block">
              Edukasi
            </Link>
            {user ? (
              <Link href="/dashboard" className="bg-[#1D9E75] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#085041] transition-colors">
                Dashboard Saya →
              </Link>
            ) : (
              <Link href="/login" className="bg-[#1D9E75] text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-[#085041] transition-colors">
                Mulai Lacak Emisi
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ 2. HERO ═════════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-[#053528] to-[#085041] min-h-screen flex items-center overflow-hidden">
        {/* Background — Organic Leaf SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="glowLeafLeft" cx="18%" cy="50%" r="30%">
              <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowLeafRight" cx="82%" cy="35%" r="38%">
              <stop offset="0%" stopColor="#9FE1CB" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#9FE1CB" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Daun besar kanan atas */}
          <path d="M640 -60 Q780 10 755 105 Q730 200 600 172 Q470 144 510 52 Q550 -40 640 -60Z" fill="#1D9E75" opacity="0.14" />
          {/* Daun medium overlap */}
          <path d="M710 50 Q790 18 798 95 Q806 172 724 175 Q642 178 655 101 Q668 44 710 50Z" fill="#0F6E56" opacity="0.24" />
          {/* Daun kecil kanan tengah */}
          <path d="M528 8 Q562 -12 576 20 Q590 52 558 66 Q526 80 510 50 Q494 20 528 8Z" fill="#9FE1CB" opacity="0.11" />
          {/* Stem daun kecil */}
          <line x1="558" y1="66" x2="548" y2="108" stroke="#9FE1CB" strokeWidth="1.2" opacity="0.16" />
          {/* Daun kecil bawah kiri */}
          <path d="M-10 160 Q40 120 72 158 Q104 196 58 215 Q12 228 -8 192 Q-28 166 -10 160Z" fill="#1D9E75" opacity="0.1" />
          {/* Daun sangat kecil kiri atas */}
          <path d="M55 14 Q82 -4 92 22 Q102 48 74 60 Q46 72 34 46 Q22 14 55 14Z" fill="#9FE1CB" opacity="0.07" />
          {/* Radial glows */}
          <rect width="800" height="220" fill="url(#glowLeafLeft)" />
          <rect width="800" height="220" fill="url(#glowLeafRight)" />
        </svg>
        <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-16 w-full py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Kiri — teks */}
            <div className="flex flex-col items-start text-left max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-[#FAC775]/20 border border-[#FAC775]/40 text-[#FAC775] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Trophy size={12} className="text-current" strokeWidth={2} /> INNOVATE CodeUp 2026 · SDG 11
              </span>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
                Lacak Emisi CO₂mu.<br />
                Kurangi Jejak Karbon.<br />
                <span className="text-[#1D9E75]">Menangkan Tantangan.</span>
              </h1>
              <p className="text-lg text-white/70 mb-10 leading-relaxed">
                Platform pelacak emisi kendaraan berbasis gamifikasi untuk mendorong mobilitas perkotaan berkelanjutan di Indonesia.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {user ? (
                  <Link href="/dashboard" className="bg-white text-[#085041] font-semibold rounded-full px-8 py-3.5 text-sm flex items-center gap-2 hover:bg-[#E1F5EE] transition shadow-lg shadow-black/20 active:scale-95 justify-center">
                    <BarChart2 size={16} strokeWidth={2} className="text-[#1D9E75]" /> Buka Dashboard Saya
                  </Link>
                ) : (
                  <Link href="/login" className="bg-white text-[#085041] font-semibold rounded-full px-8 py-3.5 text-sm flex items-center gap-2 hover:bg-[#E1F5EE] transition shadow-lg shadow-black/20 active:scale-95 justify-center">
                    <Leaf size={16} strokeWidth={2} className="text-[#1D9E75]" /> Mulai Lacak Emisi
                  </Link>
                )}
                <button onClick={scrollToStats} className="border-2 border-white/30 text-white font-medium rounded-full px-8 py-3.5 text-sm flex items-center gap-2 hover:bg-white/10 hover:border-white/50 transition active:scale-95 justify-center">
                  <BarChart2 size={16} strokeWidth={2} className="text-current" /> Lihat Data Kota
                </button>
              </div>
            </div>

            {/* Kanan — mockup card stack (solid white) */}
            <div className="hidden lg:flex items-center justify-center min-h-[420px]">
              <div className="relative flex items-center justify-center w-full h-[420px]">

                {/* Subtle glow behind cards */}
                <div className="absolute inset-0 bg-[#1D9E75]/10 rounded-3xl blur-3xl" />

                {/* Card kanan atas — Trip hari ini */}
                <div className="absolute w-44 bg-white rounded-2xl p-3 shadow-xl -right-12 top-4 rotate-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BarChart2 size={12} className="text-[#1D9E75]" />
                    <span className="text-gray-500 text-xs">Trip hari ini</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Motor · RON 92</div>
                  <div className="text-lg font-bold text-gray-800">1.08 <span className="text-xs font-normal text-gray-400">kg</span></div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-[#1D9E75] rounded-full" style={{width: '45%'}} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">45% dari target harian</div>
                </div>

                {/* Card utama — center */}
                <div className="relative w-72 bg-white rounded-2xl p-5 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#1D9E75] flex items-center justify-center">
                        <Leaf size={16} className="text-white" strokeWidth={2} />
                      </div>
                      <span className="text-gray-800 text-sm font-semibold">EmiTrack</span>
                    </div>
                    <span className="text-[#085041] text-xs bg-[#E1F5EE] px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <Flame size={11} className="text-orange-500" />
                      5 hari streak
                    </span>
                  </div>
                  {/* Emisi */}
                  <div className="text-xs text-gray-400 mb-0.5">Emisi kamu hari ini</div>
                  <div className="text-3xl font-bold text-gray-800 mb-0.5">
                    3.2 <span className="text-lg font-normal text-gray-400">kg CO₂</span>
                  </div>
                  <div className="text-xs text-[#1D9E75] font-medium mb-4">▼ 18% dari kemarin</div>
                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-xs text-gray-400 mb-0.5">Dihemat</div>
                      <div className="text-sm font-bold text-[#1D9E75]">89 kg</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-xs text-gray-400 mb-0.5">Poin</div>
                      <div className="text-sm font-bold text-[#FAC775]">1.240</div>
                    </div>
                  </div>
                  {/* Smart suggestion */}
                  <div className="flex items-center gap-2 bg-[#E1F5EE] rounded-xl p-2.5">
                    <Bus size={14} className="text-[#1D9E75] flex-shrink-0" />
                    <span className="text-xs text-gray-600">
                      Naik TransJakarta hemat{' '}
                      <strong className="text-[#1D9E75]">3.1 kg CO₂</strong>
                    </span>
                  </div>
                </div>

                {/* Card kiri bawah — Ranking */}
                <div className="absolute w-44 bg-white rounded-2xl p-3 shadow-xl -left-16 bottom-4 -rotate-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy size={12} className="text-[#FAC775]" />
                    <span className="text-gray-500 text-xs">Ranking kota</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">#4</div>
                  <div className="text-gray-400 text-xs">dari 143 pengguna</div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown size={16} />
        </div>
      </section>

      {/* ═══ 3. STATS SECTION ════════════════════════════════════════════════ */}
      <section id="stats-section" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#1D9E75] text-xs font-semibold tracking-widest uppercase mb-3">DATA REALTIME</p>
            <h2 className="text-gray-800 text-2xl font-bold mb-2">Platform EmiTrack dalam Angka</h2>
            <p className="text-gray-500 text-sm">Agregasi kontribusi seluruh pengguna</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pengguna Aktif */}
            <div ref={animUsers.ref} className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <Users size={22} className="text-[#1D9E75]" strokeWidth={1.5} />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-1">{Math.round(animUsers.value).toLocaleString('id-ID')}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Pengguna Aktif</div>
            </div>
            {/* Ton CO₂ Dihemat */}
            <div ref={animHemat.ref} className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <Leaf size={22} className="text-[#1D9E75]" strokeWidth={1.5} />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-1">{animHemat.value.toFixed(2)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Ton CO₂ Dihemat</div>
            </div>
            {/* Total Trip Hijau */}
            <div ref={animTrip.ref} className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <Bus size={22} className="text-[#1D9E75]" strokeWidth={1.5} />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-1">{Math.round(animTrip.value).toLocaleString('id-ID')}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Trip Hijau</div>
            </div>
            {/* Rata Emisi */}
            <div ref={animRata.ref} className="bg-gray-50 rounded-2xl border border-gray-100 px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <TrendingDown size={22} className="text-[#1D9E75]" strokeWidth={1.5} />
              </div>
              <div className="text-4xl font-bold text-gray-800 mb-1">{animRata.value.toFixed(2)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Rata Emisi/User</div>
              <div className="text-xs text-gray-400 mt-0.5">kg CO₂ / hari</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. GRAFIK + TABEL ═══════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-[#1D9E75] text-xs font-semibold tracking-widest uppercase mb-2">ANALISIS DATA KOTA</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Tren Emisi &amp; Perbandingan Kota</h2>
            <p className="text-gray-500 text-sm">7 hari terakhir berdasarkan data real pengguna</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grafik */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-gray-800">Tren 7 Hari Terakhir</h3>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-[#E24B4A] inline-block" /> Emisi
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-[#1D9E75] inline-block" /> Dihemat
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ display: 'none' }} />
                      <Line type="monotone" name="Emisi" dataKey="emisi" stroke="#E24B4A" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 0, fill: '#E24B4A' }} activeDot={{ r: 5 }} />
                      <Line type="monotone" name="Dihemat" dataKey="hemat" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 0, fill: '#1D9E75' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Tabel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-800 mb-6">Perbandingan per Kota</h3>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="text-left py-3 px-3 rounded-l-lg">Kota</th>
                      <th className="text-right py-3 px-2">User</th>
                      <th className="text-right py-3 px-2 hidden sm:table-cell">Emisi (kg)</th>
                      <th className="text-right py-3 px-2 text-[#1D9E75]">Hemat (kg)</th>
                      <th className="text-right py-3 px-3 rounded-r-lg">Efisiensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="py-3 px-3"><div className="h-5 bg-gray-50 rounded animate-pulse" /></td></tr>
                    )) : cityData.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-300 text-xs">Belum ada data</td></tr>
                    ) : cityData.map((row, i) => (
                      <tr key={row.kota} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-800 flex items-center gap-1.5">
                          {i === 0 && <Trophy size={16} className="text-[#FAC775]" />}
                          <span>{row.kota}</span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500 text-xs">{row.users}</td>
                        <td className="py-3 px-2 text-right text-gray-500 text-xs hidden sm:table-cell">{row.totalEmisi.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-2 text-right font-semibold text-[#1D9E75] text-xs">{row.totalHemat.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.efisiensi >= 50 ? 'bg-[#E1F5EE] text-[#085041]' :
                            row.efisiensi >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-[#E24B4A]'
                          }`}>{row.efisiensi}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. DAMPAK SECTION ════════════════════════════════════════════════ */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[#1D9E75] text-xs font-semibold tracking-widest uppercase mb-2">DAMPAK NYATA</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Kontribusi EmiTrack untuk Bumi</h2>
            <p className="text-gray-400 text-sm">Setiap perjalanan hijau yang kamu catat, berdampak nyata</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { anim: animPohon, icon: TreePine, iconBg: 'bg-[#E1F5EE]', iconColor: 'text-[#1D9E75]', label: 'SETARA', value: (v: number) => Math.round(v).toLocaleString('id-ID'), unit: 'Pohon Diselamatkan', desc: 'Berdasarkan serapan CO₂ pohon tropis' },
              { anim: animKm, icon: Car, iconBg: 'bg-red-50', iconColor: 'text-[#E24B4A]', label: 'SETARA', value: (v: number) => Math.round(v).toLocaleString('id-ID'), unit: 'Km Tidak Berkendara', desc: 'Emisi rata-rata 0,12 kg CO₂/km' },
              { anim: animLiter, icon: Fuel, iconBg: 'bg-amber-50', iconColor: 'text-[#FAC775]', label: 'SETARA', value: (v: number) => Math.round(v).toLocaleString('id-ID'), unit: 'Liter BBM Dihemat', desc: 'Faktor emisi 2,31 kg CO₂/liter' },
            ].map(({ anim, icon: Icon, iconBg, iconColor, label, value, unit, desc }) => (
              <div key={unit} ref={anim.ref} className="border border-gray-100 rounded-2xl p-8 text-center hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={24} strokeWidth={1.5} className={iconColor} />
                </div>
                <p className="text-xs text-gray-400 tracking-widest uppercase mb-1">{label}</p>
                <div className="text-4xl font-bold text-[#1D9E75] mb-1">{value(anim.value)}</div>
                <p className="text-sm font-semibold text-gray-700 mb-1">{unit}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. FITUR SECTION ════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[#1D9E75] text-xs font-semibold tracking-widest uppercase mb-2">FITUR LENGKAP</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Mengapa EmiTrack?</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">Semua yang kamu butuhkan untuk memulai perjalanan hijau</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {[
              { icon: Calculator, title: 'Kalkulator Emisi Lokal', desc: 'Berbasis RON + data IPCC & ESDM RI. Berlaku untuk semua merek BBM.' },
              { icon: Trophy, title: 'Gamifikasi & Leaderboard', desc: 'Kumpulkan poin, raih badge, bersaing dengan pengguna sekota.', isLevelCard: true },
              { icon: MapIcon, title: 'Rute Alternatif Real', desc: 'Peta Leaflet + OSRM routing — rute jalan sesungguhnya.' },
              { icon: ClipboardList, title: 'Data Publik untuk Pemda', desc: 'Data agregat emisi kota terbuka untuk pemangku kebijakan.' },
              { icon: BookOpen, title: 'Edukasi Emisi', desc: 'Pahami RON, rumus kalkulasi, dan tips kurangi emisi.' },
              { icon: Flame, title: 'Streak & Badge Harian', desc: 'Motivasi harian dengan sistem streak dan pencapaian.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#1D9E75]/30 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center mb-4 group-hover:bg-[#1D9E75]/15 transition-colors">
                  <f.icon size={20} className="text-[#1D9E75]" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                {f.isLevelCard && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {LEVELS.map(l => {
                      const IconL = l.icon
                      return (
                      <span key={l.level} 
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                        style={{ background: l.warnaLight, color: l.warna }}>
                        <IconL size={10} /> {l.nama}
                      </span>
                    )})}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. CTA SECTION ══════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-[#085041] to-[#053528] py-20 text-center">
        <div className="max-w-xl mx-auto px-6">
          <Image src="/EmiTrackLogo3.png" alt="" width={60} height={60} className="object-contain mx-auto mb-6 opacity-90 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-white mb-3">Mulai lacak emisimu hari ini</h2>
          <p className="text-white/60 text-base mb-8 leading-relaxed">
            Bergabung dengan pengguna EmiTrack dan berkontribusi pada kota yang lebih hijau
          </p>
          {user ? (
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-[#085041] font-semibold rounded-full px-8 py-4 text-base hover:bg-[#E1F5EE] transition shadow-xl">
              <BarChart2 size={18} strokeWidth={2} className="text-[#1D9E75]" /> Lanjut ke Dashboard
            </Link>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#085041] font-semibold rounded-full px-8 py-4 text-base hover:bg-[#E1F5EE] transition shadow-xl">
              <Leaf size={18} strokeWidth={2} className="text-[#1D9E75]" /> Daftar dengan Google — Gratis
            </Link>
          )}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
            {['Mendukung SDG 11', 'Data aman', 'Gratis selamanya'].map((t) => (
              <span key={t} className="text-white/40 text-xs flex items-center gap-1.5">
                <Check size={12} strokeWidth={3} className="text-[#1D9E75]" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. FOOTER ═══════════════════════════════════════════════════════ */}
      <footer className="bg-[#053528] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8">
            <Image src="/EmiTrackLogo1.png" alt="EmiTrack" width={110} height={36} className="object-contain brightness-0 invert opacity-70" />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/kalkulator', label: 'Kalkulator' },
                { href: '/peta', label: 'Peta' },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/edukasi', label: 'Edukasi' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-white/40 text-sm hover:text-white/70 transition-colors">{label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6">
            <p className="text-white/30 text-xs">© 2026 EmiTrack · INNOVATE CodeUp · SDG 11</p>
            <p className="text-white/30 text-xs">Data diperbarui realtime · Sumber: IPCC 2021 + ESDM RI</p>
          </div>
        </div>
      </footer>

      {/* ═══ MODAL LOGIN ═════════════════════════════════════════════════════ */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setIsLoginModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative z-10">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-lg">
              <X size={20} />
            </button>
            <Image src="/EmiTrackLogo2.png" alt="EmiTrack" width={160} height={100} className="object-contain mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-800 text-center mb-1">Masuk ke EmiTrack</h3>
            <p className="text-sm text-gray-400 text-center mb-6">Mulai lacak jejak karbon harianmu</p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Lanjutkan dengan Google
            </button>
            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              Dengan mendaftar, kamu menyetujui penggunaan data<br/>untuk tujuan lingkungan
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
