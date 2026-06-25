'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { RATA_RATA_NASIONAL } from '@/lib/emisi'
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/Skeleton'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toBlob } from 'html-to-image'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, TreePine, Award, Zap, ChevronRight, Gift, Share, X, MapPin,
  Flame, Trophy, Medal, Star, Car, Bike, Train, Bus, Copy,
  MessageSquare, Image as ImageIcon, TrendingUp
} from 'lucide-react'
import { getUserCity } from '@/lib/location'
import { getLevelByPoin } from '@/lib/level'
import LevelBadge from '@/components/LevelBadge'

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

type Profile = {
  id?: string
  username: string
  kota: string
  total_poin: number
  total_hemat: number
  streak: number
}

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function sapaanWaktu() {
  const jam = new Date().getHours()
  if (jam >= 5 && jam < 11) return 'Selamat pagi'
  if (jam >= 11 && jam < 15) return 'Selamat siang'
  if (jam >= 15 && jam < 19) return 'Selamat sore'
  return 'Selamat malam'
}

function fmtEmisi(n: number) {
  return Number(n.toFixed(3))
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [trips, setTrips] = useState<Trip[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [emisiHariIni, setEmisiHariIni] = useState(0)
  const [chartData, setChartData] = useState<{ hari: string; emisi: number }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [topUsers, setTopUsers] = useState<Profile[]>([])

  const [kotaOpen, setKotaOpen] = useState(false)
  const [provinsiList, setProvinsiList] = useState<{ id: string; name: string }[]>([])
  const [kotaList, setKotaList] = useState<{ id: string; name: string }[]>([])
  const [selectedProvId, setSelectedProvId] = useState('')
  const [loadingProv, setLoadingProv] = useState(false)
  const [loadingKota, setLoadingKota] = useState(false)
  const [savingKota, setSavingKota] = useState(false)
  const kotaRef = useRef<HTMLDivElement>(null)

  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (kotaRef.current && !kotaRef.current.contains(e.target as Node)) {
        setKotaOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    const tujuhHariLalu = new Date()
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7)

    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user!.id)
      .gte('created_at', tujuhHariLalu.toISOString())
      .order('created_at', { ascending: false })

    if (tripsData) {
      setTrips(tripsData)
      const emisiToday = tripsData
        .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
        .reduce((acc, t) => acc + t.emisi_kg, 0)

      setEmisiHariIni(fmtEmisi(emisiToday))

      const grouped: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[d.toDateString()] = 0
      }

      tripsData.forEach(t => {
        const key = new Date(t.created_at).toDateString()
        if (grouped[key] !== undefined) grouped[key] += t.emisi_kg
      })

      setChartData(
        Object.entries(grouped).map(([k, v]) => ({
          hari: HARI[new Date(k).getDay()],
          emisi: fmtEmisi(v)
        }))
      )
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (profileData) {
      if (!profileData.kota) {
        const det = await getUserCity()
        profileData.kota = det
        supabase.from('profiles').update({ kota: det }).eq('id', user!.id).then()
      }
      setProfile(profileData)
    }

    const { data: topData } = await supabase
      .from('profiles')
      .select('*')
      .order('total_poin', { ascending: false })
      .limit(3)

    if (topData) setTopUsers(topData)

    setDataLoading(false)
  }

  async function handleSaveKota(n: string) {
    setSavingKota(true)
    await supabase.from('profiles').update({ kota: n }).eq('id', user!.id)
    setProfile(p => p ? { ...p, kota: n } : null)
    setKotaOpen(false)
    setSavingKota(false)
  }

  async function handleShareImage(textToShare: string) {
    if (!cardRef.current) return
    setIsGeneratingImage(true)
    try {
      const blob = await toBlob(cardRef.current, { cacheBust: true })
      if (!blob) throw new Error("Gagal")
      const file = new File([blob], "emitrack.png", { type: "image/png" })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "EmiTrack", text: textToShare })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'emitrack.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      alert("Maaf, gagal memproses gambar.")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const totalHematTrips = fmtEmisi(trips.reduce((a, t) => a + (t.emisi_dihemat ?? 0), 0))
  const vsRataRata = Number(((emisiHariIni / RATA_RATA_NASIONAL) * 100).toFixed(0))
  const targetHarian = 3
  const progressPercent = Math.min((emisiHariIni / targetHarian) * 100, 100)
  const isOverLimit = emisiHariIni > targetHarian
  const poin = profile?.total_poin ?? 0
  const todayTrips = trips.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
  const totalHematHariIni = fmtEmisi(todayTrips.reduce((s, t) => s + (t.emisi_dihemat || 0), 0))

  // HITUNGAN POIN HARI INI VS KEMARIN
  const todayPoints = todayTrips.reduce((s, t) => s + (t.poin_didapat || 0), 0)
  const yesterdayStr = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
  const yesterdayPoints = trips.filter(t => new Date(t.created_at).toDateString() === yesterdayStr).reduce((s, t) => s + (t.poin_didapat || 0), 0)
  const pointDiff = todayPoints - yesterdayPoints

  let smartMsg = todayTrips.length === 0
    ? 'Belum ada perjalanan hari ini. Mulai gunakan transportasi umum untuk menghemat emisi!'
    : `Jika kamu naik transportasi umum, ${totalHematHariIni} kg CO₂ yang kamu hemat setara dengan ${Math.floor(totalHematHariIni / 0.0575)} Pohon Mahoni`

  let smartBtnLink = '/peta'
  let smartBtnText = 'Coba Rute Hijau'

  return (
    <div className="flex min-h-screen bg-[#F8FAF9] relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: `radial-gradient(#1D9E75 1.5px, transparent 0)`, backgroundSize: '40px 40px' }}
      />

      <Sidebar />

      <div className="flex-1 flex flex-col relative z-10">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
          <div className="min-w-0">
            <div className="font-bold text-gray-800">Dashboard</div>
            <div className="text-xs text-gray-400">{sapaanWaktu()}, {profile?.username || 'User'}!</div>
          </div>

          <div className="flex items-center gap-3">
            {/* 1. Tombol Bagikan */}
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-[#E1F5EE] text-[#1D9E75] rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Share size={14} /> Bagikan
            </button>

            {/* 2. Lokasi */}
            <div className="relative" ref={kotaRef}>
              <button
                onClick={() => setKotaOpen(!kotaOpen)}
                className="flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl border border-gray-100 shadow-sm hover:bg-gray-100 transition-colors"
              >
                <MapPin size={14} />
                {profile?.kota || 'Set Lokasi'}
              </button>

              {kotaOpen && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                  <div className="text-xs font-bold text-gray-800 mb-2">Ubah Lokasi</div>
                  <input
                    type="text"
                    id="kotaInput"
                    defaultValue={profile?.kota}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs mb-2 outline-none focus:border-[#1D9E75]"
                    placeholder="Masukkan kota..."
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById('kotaInput') as HTMLInputElement).value;
                      if (val) handleSaveKota(val);
                    }}
                    disabled={savingKota}
                    className="w-full bg-[#1D9E75] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#0F6E56] transition-colors"
                  >
                    {savingKota ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Streak */}
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-black px-3 py-2 rounded-xl border border-orange-100 shadow-sm">
              <Flame size={14} fill="currentColor" /> {profile?.streak ?? 0}
            </div>

            {/* 4. Level */}
            <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
              <TreePine size={14} /> {getLevelByPoin(poin).nama}
            </div>

            {/* 5. Profile Icon */}
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer hover:scale-105 transition-transform">
              {(profile?.username || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {dataLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="h-40 bg-gray-200 rounded-2xl" />
                <div className="h-40 bg-gray-200 rounded-2xl col-span-2" />
              </div>
            </div>
          ) : (
            <>
              {/* Row 1: Profile & Leaderboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <div className="md:col-span-1 flex flex-col">
                  <LevelBadge poin={poin} size="lg" />
                </div>

                <div className="md:col-span-2 bg-gradient-to-br from-white to-[#F0FFF9] rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D9E75]/5 rounded-bl-full -z-0" />

                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2 text-[11px] font-black text-gray-800 uppercase tracking-widest">
                      <Trophy size={18} className="text-[#FAC775]" strokeWidth={2.5} /> Pahlawan Bumi Minggu Ini
                    </div>
                    <a href="/leaderboard" className="text-[10px] font-black text-[#1D9E75] bg-white border border-green-100 px-3 py-1 rounded-lg hover:bg-green-50 uppercase transition-all">
                      Lihat Semua
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-4 relative z-10">
                    {topUsers.map((u, i) => (
                      <div key={u.id} className={`rounded-2xl p-4 flex flex-col items-center border shadow-sm transition-all hover:scale-[1.02] ${i === 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-50'}`}>
                        <div className="relative mb-2">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${i === 0 ? 'bg-amber-400 text-white' : 'bg-[#E1F5EE] text-[#1D9E75]'}`}>
                            {(u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                        </div>
                        <p className="text-[11px] font-black text-gray-700 truncate w-full text-center">{u.username}</p>
                        <p className={`text-[10px] font-bold ${i === 0 ? 'text-amber-600' : 'text-[#1D9E75]'}`}>{u.total_poin} pts</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: 4 Main Infographic Cards (EMISI, POHON, PERFORMA, EFISIENSI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* 1. EMISI GAUGE */}
                <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl opacity-60" />
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Emisi Hari Ini</p>

                  <div className="relative w-40 h-24 mb-2">
                    <svg viewBox="0 0 100 55" className="w-full h-full drop-shadow-sm">
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F1F5F9" strokeWidth="12" strokeLinecap="round" />
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke={isOverLimit ? '#EF4444' : '#F59E0B'}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="125.6"
                        strokeDashoffset={125.6 - (progressPercent / 100 * 125.6)}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                      <span className={`text-2xl font-black leading-none ${isOverLimit ? 'text-red-600' : 'text-amber-500'}`}>{emisiHariIni}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase mt-1">kg CO₂</span>
                    </div>
                  </div>

                  <div className={`mt-4 px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOverLimit ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-500'}`}>
                    {isOverLimit ? 'Over Limit' : 'Aman'}
                  </div>
                </div>

                {/* 2. TOTAL HEMAT */}
                <div className="bg-[#1D9E75] rounded-[24px] p-6 shadow-lg shadow-green-100 flex flex-col justify-between text-white relative overflow-hidden group h-full">
                  <TreePine size={120} className="absolute -right-10 -bottom-10 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />

                  <div className="relative z-10 flex flex-col h-full">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 mb-4 text-center">
                      Total Hemat
                    </p>

                    <div className="flex-1 flex flex-col justify-center gap-6">
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex-shrink-0 flex items-center justify-center border border-white/20 shadow-inner">
                          <TreePine size={24} className="text-white drop-shadow-sm" />
                        </div>

                        <div className="flex flex-col text-left">
                          <h4 className="text-4xl font-black tracking-tighter leading-none mb-1">
                            {totalHematTrips} <span className="text-sm font-bold opacity-80 uppercase">kg CO₂</span>
                          </h4>
                          <p className="text-[11px] font-bold opacity-90 leading-tight">
                            Setara menanam <span className="text-yellow-300">{Math.max(Math.floor((totalHematTrips / 21) * 100), 0)}% dari 1 pohon</span>
                          </p>
                        </div>
                      </div>

                      <div className="w-full">
                        <div className="flex justify-between text-[9px] font-black uppercase mb-1.5 opacity-80">
                          <span>Dihemat</span>
                          <span>Terbuang</span>
                        </div>

                        <div className="h-4 w-full bg-black/20 rounded-full flex overflow-hidden p-0.5 shadow-inner">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-1000 relative"
                            style={{ width: `${totalHematTrips + emisiHariIni > 0 ? (totalHematTrips / (totalHematTrips + emisiHariIni)) * 100 : 0}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50 animate-pulse"></div>
                          </div>
                        </div>

                        <div className="flex justify-between text-[9px] font-bold mt-1.5 opacity-70">
                          <span>{totalHematTrips} kg</span>
                          <span>{emisiHariIni} kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PERFORMA AKSI */}
                <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-50 rounded-full blur-2xl opacity-60" />

                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Performa Aksi</p>
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${pointDiff >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {pointDiff >= 0 ? <TrendingUp size={12} /> : null} {pointDiff > 0 ? '+' : ''}{pointDiff} Pts
                    </div>
                  </div>

                  <div className="flex items-stretch gap-3 relative z-10 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-[16px] p-3 flex flex-col items-center justify-center border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kemarin</span>
                      <span className="text-2xl font-black text-gray-300">{yesterdayPoints}</span>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 z-20">
                      <Zap size={14} className="text-amber-500" fill="currentColor" />
                    </div>

                    <div className={`flex-1 rounded-[16px] p-3 flex flex-col items-center justify-center border relative overflow-hidden transition-all duration-500 ${todayPoints >= yesterdayPoints && todayPoints > 0 ? 'bg-gradient-to-br from-[#E1F5EE] to-[#C2EAE0] border-green-200 scale-105 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                      {todayPoints > yesterdayPoints && (
                        <div className="absolute inset-0 bg-white/30 animate-pulse rounded-[16px]"></div>
                      )}
                      <span className={`text-[9px] font-black uppercase tracking-widest mb-1 relative z-10 ${todayPoints >= yesterdayPoints && todayPoints > 0 ? 'text-[#1D9E75]' : 'text-gray-400'}`}>Hari Ini</span>
                      <span className={`text-3xl font-black relative z-10 ${todayPoints >= yesterdayPoints && todayPoints > 0 ? 'text-[#1D9E75]' : 'text-gray-600'}`}>
                        {todayPoints}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-50 flex items-center justify-center text-center relative z-10">
                    <p className="text-[10px] font-bold text-gray-600 leading-snug">
                      {pointDiff > 0
                        ? `🔥 Mantap! Hari ini kamu lebih hijau dari kemarin.`
                        : pointDiff === 0 && todayPoints > 0
                          ? `⚡ Poinmu seri! Besok harus lebih banyak ya.`
                          : pointDiff === 0 && todayPoints === 0
                            ? `🌱 Belum ada aksi hari ini. Yuk mulai bergerak!`
                            : `Ayo kejar ketertinggalan ${Math.abs(pointDiff)} poinmu!`}
                    </p>
                  </div>
                </div>

                {/* 4. EFISIENSI */}
                <div className="bg-gradient-to-br from-white to-[#E1F5EE] rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative group overflow-hidden">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-10">Efisiensi Kamu</p>

                  <div className="w-full px-4 mb-10">
                    <div className="h-3 w-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full relative shadow-inner">
                      <div className="absolute left-1/2 -top-1 w-0.5 h-6 bg-gray-300 flex flex-col items-center">
                        <div className="absolute -top-5 text-[8px] font-black text-gray-400 uppercase text-center leading-none">
                          Rata-rata
                        </div>
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out" style={{ left: `${Math.min(vsRataRata, 100)}%` }}>
                        <div className="w-6 h-6 bg-white border-[5px] border-gray-800 rounded-full shadow-lg -ml-3 ring-4 ring-white/50 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h4 className={`text-3xl font-black tracking-tighter ${vsRataRata < 100 ? 'text-[#1D9E75]' : 'text-red-500'}`}>
                      {vsRataRata}%
                    </h4>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      {vsRataRata < 100 ? '🌿 HEBAT! LEBIH HIJAU' : '⚠️ KURANGI EMISIMU'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 3: Chart & Smart Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="bg-white rounded-[24px] border border-gray-100 p-6 flex flex-col shadow-sm">
                  <div className="text-sm font-medium text-gray-700 mb-6">Emisi 7 Hari Terakhir (kg CO₂)</div>
                  <div className="flex-1 min-h-[220px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="hari" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip formatter={(v) => [`${v} kg CO₂`, 'Emisi']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }} />
                          <Bar dataKey="emisi" radius={[6, 6, 0, 0]}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={i === chartData.length - 1 ? '#FAC775' : '#1D9E75'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-300 italic text-center">
                        Belum ada data trip. Mulai dari Kalkulator!
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-8 border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:bg-[#F0FFF9] transition-all shadow-sm">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-[#E1F5EE] rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-[#E1F5EE] rounded-2xl text-[#1D9E75] shadow-sm">
                        <Zap size={22} fill="currentColor" />
                      </div>
                      <h3 className="text-[#1D9E75] font-black uppercase text-xs tracking-[0.2em]">Smart Action Plan</h3>
                    </div>

                    <p className="text-sm font-bold text-gray-600 leading-relaxed mb-8 pr-12">
                      {smartMsg}
                    </p>

                    <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-green-50 shadow-sm">
                      <div className="flex justify-between text-[11px] font-black text-gray-400 mb-3 uppercase tracking-widest">
                        <span>Jejak Kamu vs Target Aman</span>
                        <span>{emisiHariIni} kg / {targetHarian} kg</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ${isOverLimit ? 'bg-red-500' : 'bg-[#1D9E75]'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <a href={smartBtnLink} className="relative z-10 mt-8 w-full flex items-center justify-center gap-2 py-4 bg-[#1D9E75] text-white font-black text-xs rounded-2xl hover:bg-[#0F6E56] transition-all shadow-lg shadow-green-100 tracking-widest uppercase">
                    {smartBtnText} <ChevronRight size={18} />
                  </a>
                </div>
              </div>

              {/* Row 4: History Table */}
              <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Aktivitas Terakhir</h3>
                  <div className="px-4 py-1 bg-gray-50 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest uppercase tracking-widest">
                    Baru Saja
                  </div>
                </div>

                <div className="space-y-4">
                  {trips.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[24px] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#1D9E75] group-hover:scale-110 transition-transform">
                          {t.jenis === 'motor' ? <Bike size={22} /> : (t.jenis === 'transportasi_umum' ? <Train size={22} /> : <Car size={22} />)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 capitalize tracking-tight">
                            {t.jenis.replace('_', ' ')} — {t.bbm}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {t.jarak_km} km · {new Date(t.created_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-amber-600">
                        {fmtEmisi(t.emisi_kg)} <span className="text-[10px] font-bold opacity-60 uppercase">kg CO₂</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowShareModal(false)} className="absolute -top-12 right-0 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors">
              <X size={24} />
            </button>

            <div ref={cardRef} className="w-full aspect-[9/16] bg-gradient-to-br from-[#1D9E75] to-[#042820] rounded-[32px] p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <img src="/EmiTrackLogo1.png" className="h-6 brightness-0 invert" />
                <span className="text-[10px] font-black bg-white/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/20">
                  Earth Hero {new Date().getFullYear()}
                </span>
              </div>

              <div className="relative z-10 text-center space-y-2">
                <p className="text-xs font-black text-[#FAC775] uppercase tracking-[0.3em]">Aksi Hijau Saya</p>
                <h2 className="text-4xl font-black leading-tight text-white">Menebus<br />Emisi</h2>
                <div className="text-6xl font-black text-white drop-shadow-2xl">{totalHematTrips}</div>
                <p className="text-lg font-black opacity-50 uppercase tracking-widest">kg CO₂</p>
              </div>

              <div className="relative z-10 bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 grid grid-cols-2 gap-4">
                <div className="text-center border-l border-white/10">
                  <p className="text-[8px] font-black uppercase opacity-60 mb-1">Streak</p>
                  <p className="text-xs font-black">{profile?.streak ?? 0} Hari</p>
                </div>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => handleShareImage('Menebus emisi bareng EmiTrack!')} disabled={isGeneratingImage} className="py-4 bg-[#1D9E75] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:shadow-lg transition-all shadow-green-100 flex items-center justify-center gap-2">
                {isGeneratingImage ? 'Processing...' : <><ImageIcon size={14} /> Gambar</>}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`Saya hemat ${totalHematTrips} kg CO₂ bareng EmiTrack!`); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="py-4 bg-gray-100 text-gray-700 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                {copied ? 'Tersalin' : 'Copy Text'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}