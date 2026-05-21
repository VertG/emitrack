'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { hitungEmisi, RATA_RATA_NASIONAL } from '@/lib/emisi'
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/Skeleton'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useRouter } from 'next/navigation'
import { CheckCircle2, TreePine, Award, Zap, ChevronRight, Gift } from 'lucide-react'

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

/** Format angka emisi konsisten 3 desimal agar tidak ada pembulatan yang menipu (0.088 tetap 0.088, bukan 0.09) */
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

  // Kota picker state — 2-step: Provinsi → Kota/Kab via emsifa API
  const [kotaOpen, setKotaOpen] = useState(false)
  const [provinsiList, setProvinsiList] = useState<{ id: string; name: string }[]>([])
  const [kotaList, setKotaList] = useState<{ id: string; name: string }[]>([])
  const [selectedProvId, setSelectedProvId] = useState('')
  const [selectedProvName, setSelectedProvName] = useState('')
  const [loadingProv, setLoadingProv] = useState(false)
  const [loadingKota, setLoadingKota] = useState(false)
  const [savingKota, setSavingKota] = useState(false)
  const kotaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  // Close kota dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (kotaRef.current && !kotaRef.current.contains(e.target as Node)) {
        setKotaOpen(false)
        setSelectedProvId('')
        setSelectedProvName('')
        setKotaList([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load provinsi saat dropdown dibuka
  useEffect(() => {
    if (!kotaOpen || provinsiList.length > 0) return
    setLoadingProv(true)
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(r => r.json())
      .then(data => setProvinsiList(data))
      .catch(() => {})
      .finally(() => setLoadingProv(false))
  }, [kotaOpen])

  // Load kota saat provinsi dipilih
  useEffect(() => {
    if (!selectedProvId) return
    setLoadingKota(true)
    setKotaList([])
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvId}.json`)
      .then(r => r.json())
      .then(data => setKotaList(data))
      .catch(() => {})
      .finally(() => setLoadingKota(false))
  }, [selectedProvId])

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

      const hari = new Date().toDateString()
      const emisiToday = tripsData
        .filter(t => new Date(t.created_at).toDateString() === hari)
        .reduce((acc, t) => acc + t.emisi_kg, 0)
      setEmisiHariIni(fmtEmisi(emisiToday))

      const grouped: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toDateString()
        grouped[key] = 0
      }
      tripsData.forEach(t => {
        const key = new Date(t.created_at).toDateString()
        if (grouped[key] !== undefined) {
          grouped[key] += t.emisi_kg
        }
      })
      setChartData(Object.entries(grouped).map(([k, v]) => ({
        hari: HARI[new Date(k).getDay()],
        emisi: fmtEmisi(v),
      })))
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (profileData) setProfile(profileData)

    // Fetch top 3 users for Leaderboard Preview
    const { data: topData } = await supabase
      .from('profiles')
      .select('*')
      .order('total_poin', { ascending: false })
      .limit(3)
    
    if (topData) {
      setTopUsers(topData)
    }

    setDataLoading(false)
  }

  async function handleSaveKota(kotaName: string) {
    setSavingKota(true)
    await supabase.from('profiles').update({ kota: kotaName }).eq('id', user!.id)
    setProfile(p => p ? { ...p, kota: kotaName } : null)
    setKotaOpen(false)
    setSelectedProvId('')
    setSelectedProvName('')
    setKotaList([])
    setSavingKota(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>

  // Gunakan fmtEmisi secara konsisten agar tidak ada perbedaan antara stat cards dan smart comparison
  const totalHematTrips = fmtEmisi(trips.reduce((a, t) => a + (t.emisi_dihemat ?? 0), 0))

  const emisiKemarin = trips
    .filter(t => {
      const kemarin = new Date()
      kemarin.setDate(kemarin.getDate() - 1)
      return new Date(t.created_at).toDateString() === kemarin.toDateString()
    })
    .reduce((a, t) => a + t.emisi_kg, 0)

  const persenVsKemarin = emisiKemarin > 0
    ? Number(((emisiHariIni - emisiKemarin) / emisiKemarin * 100).toFixed(0))
    : 0

  const vsRataRata = Number(((emisiHariIni / RATA_RATA_NASIONAL) * 100).toFixed(0))

  const todayStr = new Date().toDateString()
  const todayTrips = trips.filter(t => new Date(t.created_at).toDateString() === todayStr)
  const tripHijauHariIni = todayTrips.filter(t => t.jenis === 'transportasi_umum').length
  // totalHematHariIni pakai fmtEmisi agar konsisten dengan tampilan di stat card
  const totalHematHariIni = fmtEmisi(todayTrips.reduce((s, t) => s + (t.emisi_dihemat || 0), 0))

  let smartMsg = ''
  let smartBtnText = ''
  let smartBtnLink = ''

  if (todayTrips.length === 0) {
    smartMsg = 'Belum ada perjalanan hari ini. Mulai catat perjalananmu dan lihat dampak emisimu! 🌱'
    smartBtnText = 'Catat Perjalanan →'
    smartBtnLink = '/kalkulator'
  } else if (tripHijauHariIni > 0) {
    // Pohon dewasa serap ~21kg/tahun = ~0.0575kg/hari. Total hemat harian dibagi 0.0575.
    const pohon = Math.floor(totalHematHariIni / 0.0575)
    smartMsg = `${totalHematHariIni} kg CO₂ yang kamu hemat hari ini setara dengan kemampuan serap ${pohon} Pohon Mahoni 🌳`
    smartBtnText = 'Lihat Leaderboard'
    smartBtnLink = '/leaderboard'
  } else {
    const hematEstimasi = fmtEmisi(emisiHariIni * 0.94)
    const pohon = Math.floor(hematEstimasi / 0.0575)
    smartMsg = `Jika kamu naik transportasi umum, ${hematEstimasi} kg CO₂ yang kamu hemat setara dengan ${pohon} Pohon Mahoni 🌳`
    smartBtnText = 'Coba Rute Hijau'
    smartBtnLink = '/peta'
  }

  // Leveling Logic
  const poin = profile?.total_poin ?? 0
  let levelName = '🌱 Pemula Hijau'
  let levelNext = 100
  let levelNum = 1
  if (poin >= 100 && poin < 500) {
    levelName = '🥉 Bronze Commuter'
    levelNext = 500
    levelNum = 2
  } else if (poin >= 500) {
    levelName = '🥈 Silver Commuter'
    levelNext = 1500
    levelNum = 3
  }

  const targetHarian = 3
  const progressPercent = Math.min((emisiHariIni / targetHarian) * 100, 100)
  const isOverLimit = emisiHariIni > targetHarian

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <div>
            <div className="font-medium text-gray-800">Dashboard</div>
            <div className="text-xs text-gray-400">{sapaanWaktu()}, {profile?.username || user?.email?.split('@')[0]}!</div>
          </div>
          <div className="flex items-center gap-3">

            {/* Kota Picker — dropdown dengan API wilayah Indonesia */}
            <div className="relative" ref={kotaRef}>
              <button
                onClick={() => { setKotaOpen(o => !o) }}
                className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-gray-200 transition-colors"
                title="Ubah kota"
              >
                📍 {profile?.kota || 'Pilih Kota'} <span className="opacity-40 text-[10px]">▾</span>
              </button>

              {kotaOpen && (
                <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-lg border border-gray-100 w-72 overflow-hidden">
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                    {selectedProvId ? (
                      <button
                        onClick={() => { setSelectedProvId(''); setSelectedProvName(''); setKotaList([]) }}
                        className="text-[#1D9E75] text-xs font-medium flex items-center gap-1 hover:underline"
                      >
                        ← {selectedProvName}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">Pilih Provinsi</span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {/* Step 1: Pilih Provinsi */}
                    {!selectedProvId && (
                      loadingProv ? (
                        <div className="text-center text-xs text-gray-400 py-6">Memuat provinsi...</div>
                      ) : (
                        provinsiList.map(prov => (
                          <button
                            key={prov.id}
                            onClick={() => { setSelectedProvId(prov.id); setSelectedProvName(prov.name) }}
                            className="w-full text-left text-xs px-3 py-2.5 hover:bg-[#E1F5EE] text-gray-600 transition-colors flex items-center justify-between"
                          >
                            <span>{prov.name}</span>
                            <span className="text-gray-300">›</span>
                          </button>
                        ))
                      )
                    )}

                    {/* Step 2: Pilih Kota/Kab */}
                    {selectedProvId && (
                      loadingKota ? (
                        <div className="text-center text-xs text-gray-400 py-6">Memuat kota/kabupaten...</div>
                      ) : (
                        kotaList.map(k => (
                          <button
                            key={k.id}
                            onClick={() => handleSaveKota(
                              k.name.replace(/\b\w/g, c => c.toUpperCase())
                            )}
                            disabled={savingKota}
                            className={`w-full text-left text-xs px-3 py-2.5 hover:bg-[#E1F5EE] transition-colors ${
                              profile?.kota === k.name.replace(/\b\w/g, c => c.toUpperCase())
                                ? 'bg-[#E1F5EE] text-[#085041] font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {k.name.replace(/\b\w/g, c => c.toUpperCase())}
                          </button>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-[#FFEDD5] text-[#EA580C] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-[#FDBA74]/50">
              <span className="text-sm">🔥</span> 
              <span>{profile?.streak ?? 0}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold shadow-sm border border-[#1D9E75]/20">
              {(profile?.username || user?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {dataLoading ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 p-4 h-[200px] flex flex-col">
                   <SkeletonText width="w-1/3" className="mb-4" />
                   <div className="flex-1 bg-gray-50 rounded animate-pulse"></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 h-[200px] flex flex-col">
                   <SkeletonText width="w-1/3" className="mb-4" />
                   <div className="flex-1 bg-gray-50 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                 <SkeletonText width="w-1/4" className="mb-4" />
                 <div className="space-y-2">
                   {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                 </div>
              </div>
            </div>
          ) : (<>

          {/* Gamification Top Row: Profile & Leaderboard Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Profile Leveling Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-[#E1F5EE] border-2 border-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75]">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-0.5">Level {levelNum}</div>
                  <div className="text-[15px] font-bold text-gray-800">{levelName}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2 font-medium">
                  <span>{poin.toLocaleString()} Poin</span>
                  <span className="text-gray-400">{levelNext.toLocaleString()} Poin</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1D9E75] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((poin / levelNext) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 mt-2.5 text-center">
                  Butuh <span className="font-bold text-gray-600">{Math.max(levelNext - poin, 0)} poin</span> lagi untuk naik level!
                </div>
              </div>
            </div>

            {/* Top 3 Leaderboard Preview */}
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <span className="text-lg">🏆</span>
                  Pahlawan Bumi Minggu Ini
                </div>
                <a href="/leaderboard" className="text-[11px] bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors">
                  Lihat Semua
                </a>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {topUsers.length > 0 ? topUsers.map((user, i) => {
                  const icons = ['🥇', '🥈', '🥉']
                  const colors = ['bg-amber-100 text-amber-600', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-600']
                  return (
                    <div key={user.id} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="relative mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colors[i] || 'bg-blue-100 text-blue-600'}`}>
                          {(user.username || user.id || 'U')[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 text-sm drop-shadow-sm">{icons[i] || '⭐'}</div>
                      </div>
                      <div className="text-xs font-semibold text-gray-700 w-full text-center truncate">{user.username || 'User'}</div>
                      <div className="text-[10px] font-medium text-[#1D9E75] mt-0.5">{user.total_poin ?? 0} pts</div>
                    </div>
                  )
                }) : (
                  <div className="col-span-3 text-center text-xs text-gray-400 py-4">Belum ada data leader</div>
                )}
              </div>
            </div>
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Emisi Hari Ini',
                val: `${emisiHariIni} kg`,
                sub: 'CO₂',
                extra: persenVsKemarin !== 0
                  ? `${persenVsKemarin > 0 ? '▲' : '▼'} ${Math.abs(persenVsKemarin)}% dari kemarin`
                  : 'Belum ada data kemarin',
                color: 'text-amber-600',
              },
              {
                label: 'Total Hemat',
                // Konsisten: tampilkan 2 desimal (sama dengan smart comparison)
                val: `${totalHematTrips} kg`,
                sub: 'CO₂ tersimpan',
                extra: `≈ ${Math.floor(totalHematTrips / 21)} pohon dewasa`,
                color: 'text-[#1D9E75]',
              },
              {
                label: 'Poin Gamifikasi',
                val: (profile?.total_poin ?? 0).toLocaleString(),
                sub: 'poin total',
                extra: 'Per trip: Sepeda +80, Trans +50, KRL +40',
                color: 'text-amber-500',
              },
              {
                label: 'vs Rata-rata',
                val: `${vsRataRata}%`,
                sub: 'dari rata-rata nasional',
                extra: vsRataRata < 100 ? '✓ Di bawah rata-rata' : '↑ Di atas rata-rata',
                color: vsRataRata < 100 ? 'text-[#1D9E75]' : 'text-red-500',
              },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xs text-gray-400 mb-2">{s.label}</div>
                <div className={`text-2xl font-medium ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
                <div className="text-xs text-gray-500 mt-2">{s.extra}</div>
              </div>
            ))}
          </div>

          {/* Chart + Smart comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-sm font-medium text-gray-700 mb-4">Emisi 7 Hari Terakhir (kg CO₂)</div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="hari" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      formatter={(v) => [`${v} kg CO₂`, 'Emisi']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}
                    />
                    <Bar dataKey="emisi" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === chartData.length - 1 ? '#FAC775' : '#1D9E75'}
                          />
                        ))}
                      </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-36 flex items-center justify-center text-sm text-gray-300">
                  Belum ada data trip. Mulai dari Kalkulator!
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
              {/* Dekorasi Background */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#E1F5EE] rounded-bl-[100px] -z-0 opacity-50" />
              <TreePine className="absolute right-4 top-4 w-12 h-12 text-[#1D9E75]/20 z-0" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D9E75] mb-3">
                  <TreePine className="w-4 h-4" /> Smart Comparison
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-6 pr-8">
                  {smartMsg}
                </p>
                
                {/* Progress bar Target */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 font-medium">
                    <span>Target Harian: {targetHarian} kg CO₂</span>
                    {emisiHariIni === 0 ? (
                      <span className="text-[#1D9E75]">Nol emisi! 🌿</span>
                    ) : (
                      <span className={isOverLimit ? 'text-red-500' : 'text-gray-700'}>{emisiHariIni} kg</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${emisiHariIni === 0 ? 'bg-[#1D9E75]' : isOverLimit ? 'bg-red-500' : 'bg-[#1D9E75]'}`}
                      style={{ width: `${emisiHariIni === 0 ? 100 : progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <a href={smartBtnLink}
                className="relative z-10 inline-flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-[#0F6E56] transition-colors w-full sm:w-fit">
                {smartBtnText} <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Recent trips */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Riwayat Perjalanan</div>
            {trips.length === 0 ? (
              <div className="text-sm text-gray-300 text-center py-6">Belum ada perjalanan</div>
            ) : (
              <div className="space-y-2">
                {trips.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {t.jenis === 'motor' ? '🏍️' : t.jenis === 'transportasi_umum'
                          ? (t.bbm === 'sepeda' ? '🚲' : t.bbm === 'krl' ? '🚆' : t.bbm === 'transjakarta' ? '🚌' : '🚃')
                          : '🚗'}
                      </span>
                      <div>
                        <div className="text-sm text-gray-700 capitalize">{t.jenis.replace('_', ' ')} — {t.bbm}</div>
                        <div className="text-xs text-gray-400">{t.jarak_km} km · {new Date(t.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                    </div>
                    {/* Tampilkan emisi dengan 3 desimal agar konsisten dengan data tersimpan */}
                    <div className="text-sm font-medium text-amber-600">{Number(t.emisi_kg).toFixed(3)} kg CO₂</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
