'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { hitungEmisi, RATA_RATA_NASIONAL } from '@/lib/emisi'
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/Skeleton'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toBlob } from 'html-to-image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, TreePine, Award, Zap, ChevronRight, Gift, Share, X, MapPin, Flame, Leaf, Sprout, Medal, Trophy, Star, Car, Bike, Bus, Train, Copy, MessageSquare, Smartphone, Image as ImageIcon } from 'lucide-react'
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

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
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

    if (profileData) {
      if (!profileData.kota) {
        // Automatically detect city if not set
        const detectedCity = await getUserCity()
        profileData.kota = detectedCity
        // Save back to Supabase silently
        supabase.from('profiles').update({ kota: detectedCity }).eq('id', user!.id).then()
      }
      setProfile(profileData)
    }

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

  async function handleShareImage(textToShare: string) {
    if (!cardRef.current) return
    setIsGeneratingImage(true)
    try {
      // Temporarily hide the close button for the screenshot (we already moved it outside, but just to be safe)
      const blob = await toBlob(cardRef.current, { cacheBust: true, style: { borderRadius: '0px' } })
      if (!blob) throw new Error("Gagal membuat gambar")
      
      const file = new File([blob], "emitrack-share.png", { type: "image/png" })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Mobile / Supported browsers: Share dialog
        await navigator.share({
          files: [file],
          title: "EmiTrack",
          text: textToShare
        })
      } else {
        // Fallback for Desktop/Unsupported
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          alert("✓ Gambar disalin ke clipboard!\n\nSilakan buka WhatsApp Web dan tekan Ctrl+V (Paste) di kolom chat.")
        } catch (clipErr) {
          // Absolute fallback: download file
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'emitrack-share.png'
          a.click()
          URL.revokeObjectURL(url)
          alert("✓ Gambar berhasil diunduh (emitrack-share.png)!\n\nSilakan kirim file tersebut di chat WhatsApp.")
        }
      }
    } catch (err) {
      console.error(err)
      alert("Maaf, gagal memproses gambar.")
    } finally {
      setIsGeneratingImage(false)
    }
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
    smartMsg = 'Belum ada perjalanan hari ini. Mulai catat perjalananmu dan lihat dampak emisimu!'
    smartBtnText = 'Catat Perjalanan →'
    smartBtnLink = '/kalkulator'
  } else if (tripHijauHariIni > 0) {
    // Pohon dewasa serap ~21kg/tahun = ~0.0575kg/hari. Total hemat harian dibagi 0.0575.
    const pohon = Math.floor(totalHematHariIni / 0.0575)
    smartMsg = `${totalHematHariIni} kg CO₂ yang kamu hemat hari ini setara dengan kemampuan serap ${pohon} Pohon Mahoni`
    smartBtnText = 'Lihat Leaderboard'
    smartBtnLink = '/leaderboard'
  } else {
    const hematEstimasi = fmtEmisi(emisiHariIni * 0.94)
    const pohon = Math.floor(hematEstimasi / 0.0575)
    smartMsg = `Jika kamu naik transportasi umum, ${hematEstimasi} kg CO₂ yang kamu hemat setara dengan ${pohon} Pohon Mahoni`
    smartBtnText = 'Coba Rute Hijau'
    smartBtnLink = '/peta'
  }

  const poin = profile?.total_poin ?? 0
  const targetHarian = 3
  const progressPercent = Math.min((emisiHariIni / targetHarian) * 100, 100)
  const isOverLimit = emisiHariIni > targetHarian

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-100 gap-2 min-w-0">
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm md:text-base truncate">Dashboard</div>
            <div className="text-xs text-gray-400 truncate">{sapaanWaktu()}, {profile?.username || user?.email?.split('@')[0]}!</div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Tombol Bagikan — ikon only on mobile */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-medium text-[#1D9E75] bg-[#E1F5EE] rounded-full hover:bg-[#c2ebd9] transition-colors"
            >
              <Share className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bagikan</span>
            </button>

            {/* Kota Picker */}
            <div className="relative" ref={kotaRef}>
              <button
                onClick={() => { setKotaOpen(o => !o) }}
                className="text-xs text-gray-500 bg-gray-100 px-2 md:px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-200 transition-colors"
                title="Ubah kota"
              >
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span className="hidden sm:inline truncate max-w-[80px]">{profile?.kota || 'Kota'}</span>
                <span className="opacity-40 text-[10px]">▾</span>
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
                            onClick={() => handleSaveKota(k.name)}
                            disabled={savingKota}
                            className={`w-full text-left text-xs px-3 py-2.5 hover:bg-[#E1F5EE] transition-colors ${
                              profile?.kota === k.name
                                ? 'bg-[#E1F5EE] text-[#085041] font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {k.name}
                          </button>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-[#FFEDD5] text-[#EA580C] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-[#FDBA74]/50">
              <Flame size={14} className="text-[#EA580C]" strokeWidth={2.5} /> 
              <span>{profile?.streak ?? 0}</span>
            </div>
            <div className="hidden md:block">
              <LevelBadge poin={profile?.total_poin ?? 0} size="sm" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold shadow-sm border border-[#1D9E75]/20">
              {(profile?.username || user?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {dataLoading ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <div className="flex h-full min-h-[140px]">
              <div className="w-full h-full">
                <LevelBadge poin={poin} size="lg" />
              </div>
            </div>

            {/* Top 3 Leaderboard Preview */}
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Trophy size={20} className="text-[#FAC775]" strokeWidth={2.5} />
                  Pahlawan Bumi Minggu Ini
                </div>
                <a href="/leaderboard" className="text-[11px] bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors">
                  Lihat Semua
                </a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {topUsers.length > 0 ? topUsers.map((user, i) => {
                  const colors = ['bg-amber-100 text-amber-600', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-600']
                  return (
                    <div key={user.id} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="relative mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colors[i] || 'bg-blue-100 text-blue-600'}`}>
                          {(user.username || user.id || 'U')[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 text-sm drop-shadow-sm">
                          {i === 0 ? <Medal size={16} className="text-amber-500 fill-amber-500" /> : 
                           i === 1 ? <Medal size={16} className="text-gray-400 fill-gray-400" /> : 
                           i === 2 ? <Medal size={16} className="text-orange-500 fill-orange-500" /> : <Star size={16} className="text-blue-500 fill-blue-500" />}
                        </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                extra: (
                  <div className="mt-1">
                    <LevelBadge poin={profile?.total_poin ?? 0} size="sm" />
                  </div>
                ),
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                        {t.jenis === 'motor' ? <Bike size={18} className="text-gray-500" /> : t.jenis === 'transportasi_umum'
                          ? (t.bbm === 'sepeda' ? <Bike size={18} className="text-[#1D9E75]" /> : (t.bbm === 'krl' || t.bbm === 'mrt') ? <Train size={18} className="text-[#1D9E75]" /> : <Bus size={18} className="text-[#1D9E75]" />)
                          : <Car size={18} className="text-gray-500" />}
                      </div>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="flex flex-col items-center w-full max-w-[340px] relative" onClick={e => e.stopPropagation()}>
            
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute -top-12 right-0 z-10 text-white hover:text-gray-200 transition-colors bg-white/10 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Preview Card (This gets screenshotted) */}
            <div ref={cardRef} className="relative w-full aspect-[9/16] bg-gradient-to-b from-[#1D9E75] via-[#085041] to-[#042820] overflow-hidden flex flex-col justify-between p-6 rounded-2xl shadow-2xl">
              {/* Background decorative elements */}
              <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-[#FAC775] opacity-20 rounded-full blur-3xl" />
              <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-[#1D9E75] opacity-40 rounded-full blur-3xl" />
              
              {/* Top part */}
              <div className="relative z-10 flex flex-col items-center mt-2 mb-8 w-full gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/EmiTrackLogo1.png" alt="EmiTrack" className="h-8 object-contain drop-shadow-md brightness-0 invert" />
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-[11px] font-bold text-[#FAC775] uppercase tracking-widest shadow-xl whitespace-nowrap">
                  EmiTrack {new Date().getFullYear()} Wrapped
                </div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-3xl font-black leading-tight text-center drop-shadow-lg text-white">
                  Saya berhasil<br/>menghemat
                </h3>
                <div className="mt-4 mb-2">
                  <span className="text-6xl font-black text-[#FAC775] drop-shadow-md">
                    {totalHematTrips}
                  </span>
                </div>
                <div className="text-xl font-bold text-[#E1F5EE] tracking-wide">kg CO₂</div>
              </div>

              {/* Bottom part / Stats */}
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#FAC775]" />
                      <span className="text-xs font-semibold text-white/90">Level Pahlawan</span>
                    </div>
                    <div className="text-sm font-bold text-white">{getLevelByPoin(poin).nama}</div>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-[#FAC775] fill-[#FAC775]" />
                      <span className="text-xs font-semibold text-white/90">Total Poin</span>
                    </div>
                    <div className="text-sm font-bold text-[#FAC775]">{poin.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-[#EA580C] fill-[#EA580C]" />
                      <span className="text-xs font-semibold text-white/90">Streak Aktif</span>
                    </div>
                    <div className="text-sm font-bold text-white">{profile?.streak ?? 0} hari</div>
                  </div>
                </div>

                {/* Footer text */}
                <div className="text-center text-[9px] font-medium text-white/50 tracking-widest uppercase mt-2">
                  {profile?.username ? `@${profile.username}` : 'Pahlawan Bumi'} • emitrack.vercel.app
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3 mt-6 bg-white rounded-2xl p-4 shadow-xl">
              <div className="flex gap-2">
                <button
                  onClick={() => handleShareImage(
                    `\u{1F33F} Saya sudah hemat ${totalHematTrips} kg CO\u2082 dengan EmiTrack!\n\nYuk ikutan: https://emitrack.vercel.app`
                  )}
                  disabled={isGeneratingImage}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1D9E75] text-white font-bold rounded-xl hover:bg-[#0F6E56] transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait text-sm"
                >
                  {isGeneratingImage ? 'Memproses...' : <><ImageIcon size={16} /> Share Gambar</>}
                </button>
                <button
                  onClick={async () => {
                    const shareText = `\u{1F33F} Saya sudah hemat ${totalHematTrips} kg CO\u2082 dengan EmiTrack!\n\n\u{1F525} Streak: ${profile?.streak ?? 0} hari\n\u{2B50} Poin: ${poin.toLocaleString()}\n\nYuk ikut jaga bumi bareng: https://emitrack.vercel.app`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Pencapaian EmiTrack',
                          text: shareText
                        });
                      } catch (err) {
                        // User cancelled or failed
                      }
                    } else {
                      navigator.clipboard.writeText(shareText);
                      alert("Teks berhasil disalin ke clipboard!");
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-sm active:scale-[0.98] text-sm"
                >
                  <MessageSquare size={16} /> Share Teks
                </button>
              </div>
              
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://emitrack.vercel.app')
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="flex-1 py-3 border-2 border-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] text-sm"
                >
                  {copied ? <span className="flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Tersalin!</span> : <span className="flex items-center justify-center gap-2"><Copy size={16} /> Copy Link</span>}
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-3 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
                >
                  <span className="flex items-center justify-center gap-1.5"><X size={16} /> Tutup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
