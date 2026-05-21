'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { hitungEmisi, RATA_RATA_NASIONAL } from '@/lib/emisi'
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/Skeleton'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useRouter } from 'next/navigation'

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

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [emisiHariIni, setEmisiHariIni] = useState(0)
  const [chartData, setChartData] = useState<{ hari: string; emisi: number }[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [editingKota, setEditingKota] = useState(false)
  const [newKota, setNewKota] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  async function fetchData() {
    // Ambil trips 7 hari terakhir
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

      // Emisi hari ini
      const hari = new Date().toDateString()
      const emisiToday = tripsData
        .filter(t => new Date(t.created_at).toDateString() === hari)
        .reduce((acc, t) => acc + t.emisi_kg, 0)
      setEmisiHariIni(Number(emisiToday.toFixed(2)))

      // Data grafik per hari
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
        emisi: Number(v.toFixed(2)),
      })))
    }

    // Ambil profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (profileData) setProfile(profileData)
    setDataLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>

  const totalHematTrips = Number(
    trips.reduce((a, t) => a + (t.emisi_dihemat ?? 0), 0).toFixed(2)
  )

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
  const totalHematHariIni = todayTrips.reduce((s, t) => s + (t.emisi_dihemat || 0), 0)

  // Smart Comparison State
  let smartMsg = ''
  let smartBtnText = ''
  let smartBtnLink = ''

  if (todayTrips.length === 0) {
    smartMsg = 'Belum ada perjalanan hari ini. Mulai catat perjalananmu dan lihat dampak emisimu! 🌱'
    smartBtnText = 'Catat Perjalanan →'
    smartBtnLink = '/kalkulator'
  } else if (tripHijauHariIni > 0) {
    const pohon = Math.floor(totalHematHariIni / 0.021)
    smartMsg = `Keren! Kamu sudah hemat ${totalHematHariIni.toFixed(2)} kg CO₂ hari ini dengan memilih transportasi hijau. Setara menanam ${pohon} pohon! 🎉`
    smartBtnText = 'Lihat Leaderboard →'
    smartBtnLink = '/leaderboard'
  } else {
    // Ada trip kendaraan tapi belum ada trip hijau
    const hematEstimasi = emisiHariIni * 0.94
    const pohon = Math.floor(hematEstimasi / 0.021)
    smartMsg = `Emisi kamu hari ini ${emisiHariIni} kg CO₂. Jika naik TransJakarta, kamu bisa hemat ${hematEstimasi.toFixed(2)} kg CO₂ setara oksigen ${pohon} pohon selama 1 hari! 🌳`
    smartBtnText = 'Coba Rute Hijau →'
    smartBtnLink = '/peta'
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
            {editingKota ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newKota}
                  onChange={e => setNewKota(e.target.value)}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 outline-none text-gray-700 w-28"
                  placeholder="Nama kota..."
                  autoFocus
                />
                <button onClick={async () => {
                  if (!newKota.trim()) { setEditingKota(false); return; }
                  await supabase.from('profiles').update({ kota: newKota.trim() }).eq('id', user!.id)
                  setProfile(p => p ? { ...p, kota: newKota.trim() } : null)
                  setEditingKota(false)
                }} className="text-xs bg-[#1D9E75] text-white px-3 py-1 rounded-full hover:bg-[#0F6E56]">Simpan</button>
                <button onClick={() => setEditingKota(false)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
              </div>
            ) : (
              <button 
                onClick={() => { setEditingKota(true); setNewKota(profile?.kota || ''); }}
                className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-gray-200 transition-colors"
                title="Ubah kota"
              >
                📍 {profile?.kota || 'Memuat...'} <span className="opacity-50">✎</span>
              </button>
            )}
            <span className="bg-[#1D9E75] text-white text-xs px-3 py-1 rounded-full">
              🔥 Streak {profile?.streak ?? 0} hari
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-medium">
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
                val: `${totalHematTrips.toFixed(1)} kg`,
                sub: 'CO₂ tersimpan',
                extra: `≈ ${Math.floor(totalHematTrips / 21)} pohon dewasa`,
                color: 'text-[#1D9E75]',
              },
              {
                label: 'Poin Gamifikasi',
                val: (profile?.total_poin ?? 0).toLocaleString(),
                sub: 'poin total',
                extra: '+10 per trip',
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

            <div className="bg-[#E1F5EE] rounded-xl border border-[#9FE1CB] p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-medium text-[#085041] mb-3">💡 Smart Comparison</div>
                <p className="text-sm text-[#0F6E56] leading-relaxed mb-4">
                  {smartMsg}
                </p>
                
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-[#085041] mb-1 font-medium">
                    <span>Target harian: {targetHarian} kg CO₂</span>
                    {emisiHariIni === 0 ? (
                      <span className="text-[#1D9E75]">Hari ini nol emisi! 🌿</span>
                    ) : (
                      <span className={isOverLimit ? 'text-red-500' : ''}>{emisiHariIni} kg</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-[#c5eadb] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${emisiHariIni === 0 ? 'bg-[#1D9E75]' : isOverLimit ? 'bg-red-500' : 'bg-[#1D9E75]'}`}
                      style={{ width: `${emisiHariIni === 0 ? 100 : progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <a href={smartBtnLink}
                className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#0F6E56] transition-colors w-fit">
                {smartBtnText}
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
                          ? (t.bbm === 'sepeda' ? '🚲' : t.bbm === 'krl' ? '🚆' : '🚌')
                          : '🚗'}
                      </span>
                      <div>
                        <div className="text-sm text-gray-700 capitalize">{t.jenis} — {t.bbm}</div>
                        <div className="text-xs text-gray-400">{t.jarak_km} km · {new Date(t.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-amber-600">{t.emisi_kg} kg CO₂</div>
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
