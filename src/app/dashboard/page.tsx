'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { RATA_RATA_NASIONAL } from '@/lib/emisi'
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
            <div className="flex items-center justify-center h-64 text-gray-300">
              <div className="text-center">
                <div className="text-3xl mb-2">🌱</div>
                <div className="text-sm">Memuat data...</div>
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

            <div className="bg-[#E1F5EE] rounded-xl border border-[#9FE1CB] p-4">
              <div className="text-xs font-medium text-[#085041] mb-3">💡 Smart Comparison</div>
              <p className="text-sm text-[#0F6E56] leading-relaxed">
                {emisiHariIni > 0
                  ? `Emisi kamu hari ini ${emisiHariIni} kg CO₂. Jika naik TransJakarta, kamu bisa hemat hingga ${(emisiHariIni * 0.94).toFixed(2)} kg CO₂!`
                  : 'Belum ada perjalanan hari ini. Input perjalananmu di Kalkulator untuk melihat perbandingan emisi!'}
              </p>
              <a href="/kalkulator"
                className="inline-flex items-center gap-2 mt-4 bg-[#1D9E75] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#0F6E56] transition-colors">
                Input Perjalanan →
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
