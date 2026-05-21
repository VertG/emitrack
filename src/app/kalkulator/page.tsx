'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { hitungEmisi, RATA_RATA_NASIONAL, rekomendasiRute, KONSUMSI, FAKTOR_EMISI, BBM_OPTIONS, LABEL_BBM, CONTOH_MEREK } from '@/lib/emisi'
import Sidebar from '@/components/Sidebar'
import { Spinner } from '@/components/Skeleton'
import { showToast } from '@/components/Toast'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart
} from 'recharts'

const JENIS_KENDARAAN = [
  { value: 'motor', label: 'Motor' },
  { value: 'mobil', label: 'Mobil' },
]

const MODA_BBM_KEYS = ['sepeda', 'krl', 'transjakarta']
const MODA_ICONS = ['🚲', '🚆', '🚌']

const HARGA_BBM_DEFAULT: Record<string, number> = {
  ron90: 10000,
  ron92: 13000,
  ron95: 15000,
  ron98: 16500,
  diesel48: 6800,
  diesel51: 14500,
  diesel53: 15500,
  listrik: 2500,
}

// Nama produk paling populer per RON (untuk label singkat)
const NAMA_POPULER: Record<string, string> = {
  ron90:    'Pertalite / Shell Regular',
  ron92:    'Pertamax / Shell Super',
  ron95:    'Pertamax Green 95 / Shell V-Power',
  ron98:    'Pertamax Turbo / Shell V-Power Nitro+',
  diesel48: 'Biosolar / Solar biasa',
  diesel51: 'Dexlite / Shell Diesel Extra',
  diesel53: 'Pertadex / Shell Diesel Premium',
  listrik:  'Semua merek EV',
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const HARI_PER_BULAN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// Emisi transjakarta per km
const EMISI_TRANSJAKARTA = 0.038

function TabProyeksi() {
  const [jenis, setJenis] = useState('motor')
  const [bbm, setBbm] = useState('ron92')
  const [jarakHarian, setJarakHarian] = useState(20)
  const [hariPerMinggu, setHariPerMinggu] = useState(5)
  const [hargaBbm, setHargaBbm] = useState(HARGA_BBM_DEFAULT['ron92'] ?? 13000)

  // Sync harga bbm ke default saat bbm berubah
  useEffect(() => {
    setHargaBbm(HARGA_BBM_DEFAULT[bbm] ?? 10000)
  }, [bbm])

  // Reset bbm jika jenis berubah
  useEffect(() => {
    setBbm('ron92')
  }, [jenis])

  // ---- Kalkulasi ----
  const emisiHari = hitungEmisi(jenis, bbm, jarakHarian)
  const hariSetahun = Math.round((hariPerMinggu / 7) * 365)
  const emisiTahun = Number((emisiHari * hariSetahun).toFixed(1))

  const konsumsiKey = `${jenis}_${bbm}`
  const konsumsiPerKm = KONSUMSI[konsumsiKey] ?? 0.1
  const konsumsiLiterTahun = Number((jarakHarian * konsumsiPerKm * hariSetahun).toFixed(0))
  const biayaBbmTahun = konsumsiLiterTahun * hargaBbm

  // Grafik bulanan 12 bulan
  const chartData = BULAN.map((bulan, i) => {
    const hariDiBulan = HARI_PER_BULAN[i]
    const hariBerkendara = Math.round((hariPerMinggu / 7) * hariDiBulan)
    const emisiKendaraan = Number((emisiHari * hariBerkendara).toFixed(1))

    // Skenario ganti 3 hari ke TransJakarta
    const hariGanti = Math.min(3, hariPerMinggu)
    const hariSisaBerkendara = Math.max(0, hariBerkendara - Math.round((hariGanti / 7) * hariDiBulan))
    const hariTransjakarta = Math.round((hariGanti / 7) * hariDiBulan)
    const emisiCampuran = Number((
      emisiHari * hariSisaBerkendara +
      jarakHarian * EMISI_TRANSJAKARTA * hariTransjakarta
    ).toFixed(1))

    return {
      bulan,
      kendaraan: emisiKendaraan,
      campuran: emisiCampuran,
    }
  })

  // Dampak visual
  const pohon = Math.round(emisiTahun / 21)
  const airLiter = Math.round(emisiTahun / 0.5)
  const jamTerbang = Number((emisiTahun / 90).toFixed(1))

  // Skenario penghematan 3 hari/minggu ke transjakarta
  const hariHijau = Math.min(3, hariPerMinggu)
  const emisiDihemat = Number(((hariHijau / hariPerMinggu) * emisiTahun * 0.94).toFixed(0))
  const hariHijauSetahun = Math.round((hariHijau / 7) * 365)
  const biayaTransjakarta = hariHijauSetahun * 2 * 3500 // PP
  const biayaBbmHijauDihemat = Math.round((hariHijau / hariPerMinggu) * biayaBbmTahun)
  const biayaDihemat = biayaBbmHijauDihemat - biayaTransjakarta
  const poinPotensi = hariHijauSetahun * 50

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INPUT */}
        <div className="space-y-4">
          {/* Jenis kendaraan */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Jenis Kendaraan</div>
            <div className="flex gap-2">
              {JENIS_KENDARAAN.map(k => (
                <button key={k.value} onClick={() => setJenis(k.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${jenis === k.value
                    ? 'bg-[#1D9E75] text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}>
                  {k.value === 'motor' ? '🏍️' : '🚗'} {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* BBM */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Bahan Bakar</div>
            <div className={`grid grid-cols-2 ${jenis === 'motor' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-2`}>
              {BBM_OPTIONS[jenis].map(b => (
                <button key={b} onClick={() => setBbm(b)}
                  title={CONTOH_MEREK[b]}
                  className={`group relative p-2 md:p-3 text-left rounded-xl border transition-colors ${bbm === b
                    ? 'bg-[#E1F5EE] border-[#1D9E75]'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}>
                  <div className={`text-sm font-bold ${bbm === b ? 'text-[#1D9E75]' : 'text-gray-700'}`}>
                    {LABEL_BBM[b]}
                  </div>
                  <div className={`text-xs truncate mt-0.5 ${bbm === b ? 'text-[#085041]/70' : 'text-gray-400'}`}>
                    {NAMA_POPULER[b]}
                  </div>
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-[#085041] text-white text-xs rounded-lg p-2.5 z-10 shadow-lg pointer-events-none">
                    Berlaku untuk: {CONTOH_MEREK[b]}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#085041]"></div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-400">
              <Link href="/edukasi" className="hover:text-[#1D9E75] hover:underline flex items-start gap-1.5">
                <span className="shrink-0 font-bold">ⓘ</span>
                <span className="leading-relaxed">RON (Research Octane Number) adalah standar internasional yang berlaku untuk semua merek — Pertamina, Shell, Vivo, BP, Total, dll.</span>
              </Link>
            </div>
          </div>

          {/* Jarak harian */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium text-gray-700">Jarak Harian</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-600">{jarakHarian}</span>
                <span className="text-sm text-gray-500">km</span>
              </div>
            </div>
            <input type="range" min={1} max={100} value={jarakHarian}
              onChange={e => setJarakHarian(Number(e.target.value))}
              className="w-full accent-[#1D9E75]" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 km</span><span>100 km</span>
            </div>
          </div>

          {/* Hari per minggu */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium text-gray-700">Hari Berkendara / Minggu</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#1D9E75]">{hariPerMinggu}</span>
                <span className="text-sm text-gray-500">hari</span>
              </div>
            </div>
            <input type="range" min={1} max={7} value={hariPerMinggu}
              onChange={e => setHariPerMinggu(Number(e.target.value))}
              className="w-full accent-[#1D9E75]" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 hari</span><span>7 hari</span>
            </div>
          </div>

          {/* Harga BBM */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Harga BBM / Liter</div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 shrink-0">Rp</span>
              <input
                type="number"
                value={hargaBbm}
                onChange={e => setHargaBbm(Number(e.target.value))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#1D9E75] bg-gray-50"
                step={100}
              />
              <button
                onClick={() => setHargaBbm(HARGA_BBM_DEFAULT[bbm] ?? 10000)}
                className="text-xs text-[#1D9E75] hover:underline shrink-0"
              >
                Reset
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">Default: Rp {(HARGA_BBM_DEFAULT[bbm] ?? 10000).toLocaleString('id-ID')}/liter</div>
          </div>
        </div>

        {/* HASIL */}
        <div className="space-y-4">
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Emisi per Hari', val: `${emisiHari}`, unit: 'kg CO₂', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Emisi per Tahun', val: `${emisiTahun}`, unit: 'kg CO₂', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
              { label: 'Konsumsi BBM', val: `${konsumsiLiterTahun.toLocaleString('id-ID')}`, unit: 'liter/tahun', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Biaya BBM', val: biayaBbmTahun >= 1000000 ? `Rp ${(biayaBbmTahun / 1000000).toFixed(2).replace('.', ',').replace(/,00$/, '')} jt` : `Rp ${Math.round(biayaBbmTahun / 1000)} rb`, unit: '/tahun', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border ${s.border} p-4 text-center`}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.unit}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Dampak visual */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">🌍 Dampak Emisi Tahunanmu</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🌳', label: 'Pohon', val: pohon.toLocaleString('id-ID'), sub: 'harus ditanam' },
                { icon: '🚿', label: 'Air', val: `${Math.round(airLiter / 1000)}rb`, sub: 'liter penyerap' },
                { icon: '✈️', label: 'Terbang', val: `${jamTerbang}`, sub: 'jam domestik' },
              ].map(d => (
                <div key={d.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <div className="text-2xl mb-1">{d.icon}</div>
                  <div className="text-sm font-bold text-gray-800">{d.val}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{d.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skenario penghematan */}
          <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-xl p-4">
            <div className="text-sm font-bold text-[#085041] mb-1">💡 Skenario Penghematan</div>
            <div className="text-xs text-[#1D9E75] mb-3">
              Jika beralih ke transportasi umum <strong>{hariHijau} hari/minggu</strong>:
            </div>
            <div className="space-y-2">
              {[
                { label: '🌿 Emisi dihemat', val: `${emisiDihemat.toLocaleString('id-ID')} kg CO₂/tahun` },
                { label: '💰 Biaya dihemat', val: `Rp ${Math.max(0, biayaDihemat).toLocaleString('id-ID')}/tahun` },
                { label: '🏆 Poin EmiTrack', val: `+${poinPotensi.toLocaleString('id-ID')} poin/tahun` },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-xs text-[#085041]">{row.label}</span>
                  <span className="text-xs font-bold text-[#085041]">{row.val}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#1D9E75] mt-3 opacity-70">
              *Estimasi biaya TransJakarta Rp 3.500/trip (PP), {hariHijauSetahun} hari/tahun
            </div>
          </div>
        </div>
      </div>

      {/* Grafik proyeksi bulanan */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="text-sm font-medium text-gray-700 mb-1">📈 Proyeksi Emisi Bulanan</div>
        <div className="text-xs text-gray-400 mb-4">Perbandingan emisi kendaraan pribadi vs campuran transportasi umum</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMerah" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E24B4A" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E24B4A" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradHijau" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit=" kg" />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any, name: any) => [
                `${val} kg CO₂`,
                name === 'kendaraan' ? 'Kendaraan Pribadi' : 'Campuran + Transjakarta'
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend
              formatter={(val) => val === 'kendaraan' ? 'Kendaraan Pribadi' : 'Campuran + Transjakarta'}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area type="monotone" dataKey="kendaraan" stroke="#E24B4A" strokeWidth={2} fill="url(#gradMerah)" dot={false} />
            <Area type="monotone" dataKey="campuran" stroke="#1D9E75" strokeWidth={2} fill="url(#gradHijau)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function KalkulatorContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'hitung' | 'proyeksi'>('hitung')

  // Tangkap parameter dari URL (misal: /kalkulator?jarak=15&jenis=mobil)
  const jarakDariUrl = searchParams.get('jarak')
  const jenisDariUrl = searchParams.get('jenis')

  // Jadikan nilai dari URL sebagai nilai awal (default state)
  const dariPeta = searchParams.get('dari-peta') === '1'
  const [jenis, setJenis] = useState(jenisDariUrl === 'mobil' ? 'mobil' : 'motor')
  const [jarak, setJarak] = useState(jarakDariUrl ? Number(jarakDariUrl) : 20)
  const [bbm, setBbm] = useState('ron92')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  // Jika dari peta, aktifkan tab hitung
  useEffect(() => {
    if (dariPeta) setActiveTab('hitung')
  }, [dariPeta])

  const emisiHarian = hitungEmisi(jenis, bbm, jarak)
  const emisiBulanan = Number((emisiHarian * 22).toFixed(1))
  const emisiTahunan = Number((emisiHarian * 264).toFixed(0))
  const vsRataRata = Number(((emisiHarian / RATA_RATA_NASIONAL) * 100).toFixed(0))
  const rekomendasi = rekomendasiRute(emisiHarian, jarak)

  async function updateStreak(tambahPoin: number, tambahHemat: number) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_poin, total_hemat, streak, updated_at')
      .eq('id', user!.id)
      .single()

    if (!profile) return

    const now = new Date()
    const nowUtc7 = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    const todayStr = nowUtc7.toISOString().split('T')[0]

    let lastUpdateStr = ''
    if (profile.updated_at) {
      const last = new Date(profile.updated_at)
      const lastUtc7 = new Date(last.getTime() + (7 * 60 * 60 * 1000))
      lastUpdateStr = lastUtc7.toISOString().split('T')[0]
    }

    let currentStreak = profile.streak || 0
    let toastMsg = ''

    if (lastUpdateStr === todayStr && currentStreak > 0) {
      toastMsg = `✓ Tersimpan! +${tambahPoin} poin`
    } else {
      if (lastUpdateStr && currentStreak > 0) {
        const d1 = new Date(todayStr).getTime()
        const d2 = new Date(lastUpdateStr).getTime()
        const diffDays = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentStreak += 1
          toastMsg = `🔥 Streak ${currentStreak} hari! Pertahankan!`
        } else if (diffDays > 1) {
          currentStreak = 1
          toastMsg = `Streak direset. Mulai lagi dari 1! 💪`
        }
      } else {
        currentStreak = 1
        toastMsg = `🔥 Streak 1 hari! Pertahankan!`
      }
    }

    await supabase
      .from('profiles')
      .update({
        total_poin: (profile.total_poin ?? 0) + tambahPoin,
        total_hemat: Number(((profile.total_hemat ?? 0) + tambahHemat).toFixed(3)),
        streak: currentStreak,
        updated_at: now.toISOString(),
      })
      .eq('id', user!.id)

    showToast(toastMsg, 'success')
  }

  async function simpanTrip() {
    if (!user) return
    setSaving(true)
    setSaveError('')

    const emisiDihemat = Math.max(0, Number((RATA_RATA_NASIONAL - emisiHarian).toFixed(3)))

    const { error } = await supabase.from('trips').insert({
      user_id: user.id,
      jenis,
      bbm,
      jarak_km: jarak,
      emisi_kg: emisiHarian,
      emisi_dihemat: emisiDihemat,
      poin_didapat: 10,
    })

    if (error) { setSaveError(error.message); setSaving(false); return }

    await updateStreak(10, emisiDihemat)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3500)
  }

  async function simpanModaAlternatif(bbmKey: string, emisiModa: number, hemat: number, poin: number) {
    if (!user) return
    setSaving(true)
    setSaveError('')

    const emisiDihemat = Number(hemat.toFixed(3))

    const { error } = await supabase.from('trips').insert({
      user_id: user.id,
      jenis: 'transportasi_umum',
      bbm: bbmKey,
      jarak_km: jarak,
      emisi_kg: Number(emisiModa.toFixed(3)),
      emisi_dihemat: emisiDihemat,
      poin_didapat: poin,
    })

    if (error) { setSaveError(error.message); setSaving(false); return }

    await updateStreak(poin, emisiDihemat)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3500)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="font-medium text-gray-800">Kalkulator Emisi</div>
          <div className="text-xs text-gray-400">Berbasis data IPCC 2021 + ESDM RI</div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white border-b border-gray-100 px-6">
          <div className="flex gap-0">
            {[
              { key: 'hitung', label: '🧮 Hitung Emisi' },
              { key: 'proyeksi', label: '📊 Proyeksi Tahunan' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'hitung' | 'proyeksi')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#1D9E75] text-[#1D9E75]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6 relative">

          {activeTab === 'proyeksi' ? (
            <TabProyeksi />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form kiri */}
              <div className="space-y-4">
                {/* Jenis kendaraan */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Jenis Kendaraan</div>
                  <div className="flex gap-2">
                    {JENIS_KENDARAAN.map(k => (
                      <button key={k.value} onClick={() => { setJenis(k.value); setBbm('ron92') }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${jenis === k.value
                          ? 'bg-[#1D9E75] text-white'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}>
                        {k.value === 'motor' ? '🏍️' : '🚗'} {k.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bahan bakar */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Bahan Bakar</div>
                  <div className={`grid grid-cols-2 ${jenis === 'motor' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-2`}>
                    {BBM_OPTIONS[jenis].map(b => (
                      <button key={b} onClick={() => setBbm(b)}
                        title={CONTOH_MEREK[b]}
                        className={`group relative p-2 md:p-3 text-left rounded-xl border transition-colors ${bbm === b
                          ? 'bg-[#E1F5EE] border-[#1D9E75]'
                          : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}>
                        <div className={`text-sm font-bold ${bbm === b ? 'text-[#1D9E75]' : 'text-gray-700'}`}>
                          {LABEL_BBM[b]}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${bbm === b ? 'text-[#085041]/70' : 'text-gray-400'}`}>
                          {NAMA_POPULER[b]}
                        </div>

                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-[#085041] text-white text-xs rounded-lg p-2.5 z-10 shadow-lg pointer-events-none">
                          Berlaku untuk: {CONTOH_MEREK[b]}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#085041]"></div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    <Link href="/edukasi" className="hover:text-[#1D9E75] hover:underline flex items-start gap-1.5">
                      <span className="shrink-0 font-bold">ⓘ</span>
                      <span className="leading-relaxed">RON (Research Octane Number) adalah standar internasional yang berlaku untuk semua merek — Pertamina, Shell, Vivo, BP, Total, dll.</span>
                    </Link>
                  </div>
                </div>

                {/* Jarak */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-700">Jarak Tempuh Harian</div>
                      {dariPeta && (
                        <span className="text-[10px] bg-[#E1F5EE] text-[#085041] border border-[#9FE1CB] px-2 py-0.5 rounded-full font-medium">
                          📍 Dari Peta
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.1}
                        value={jarak}
                        onChange={e => !dariPeta && setJarak(Number(e.target.value))}
                        readOnly={dariPeta}
                        className={`w-20 text-right font-medium text-amber-600 border rounded-md px-2 py-1 focus:outline-none ${dariPeta
                          ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500'
                          : 'bg-gray-50 border-gray-200 focus:border-[#1D9E75]'
                          }`}
                      />
                      <span className="text-sm font-medium text-gray-500">km</span>
                    </div>
                  </div>

                  {!dariPeta && (
                    <input type="range" min={0.0} max={100} step={0.1} value={jarak}
                      onChange={e => setJarak(Number(e.target.value))}
                      className="w-full accent-[#1D9E75]" />
                  )}
                  {dariPeta && (
                    <div className="text-xs text-gray-400 mt-1">
                      Jarak dikunci berdasarkan rute dari Peta.
                    </div>
                  )}
                </div>

                {/* Rumus */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-xs text-gray-400 mb-2">Rumus Kalkulasi (IPCC 2021)</div>
                  <div className="font-mono text-sm bg-gray-50 rounded-lg px-3 py-2.5 text-[#1D9E75] border-l-2 border-[#1D9E75]">
                    E = D × FE × FK
                  </div>
                  <div className="text-xs text-gray-400 mt-3 space-y-1">
                    <div>E = Emisi CO₂ (kg) &nbsp;|&nbsp; D = Jarak (km)</div>
                    <div>FE = Faktor emisi bahan bakar (kg CO₂/liter)</div>
                    <div>FK = Konsumsi bahan bakar (liter/km)</div>
                  </div>
                </div>
              </div>

              {/* Hasil kanan */}
              <div className="space-y-4">
                {/* Hasil estimasi */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-4">Hasil Estimasi CO₂</div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Harian', val: `${emisiHarian}`, unit: 'kg CO₂', color: 'text-amber-600' },
                      { label: 'Bulanan', val: `${emisiBulanan}`, unit: 'kg CO₂', color: 'text-[#1D9E75]' },
                      { label: 'Tahunan', val: `${emisiTahunan}`, unit: 'kg CO₂', color: 'text-red-500' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <div className={`text-xl font-medium ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.unit}</div>
                        <div className="text-xs text-gray-300 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-100 text-sm text-gray-600 leading-relaxed">
                    {vsRataRata < 100
                      ? `✓ Emisi kamu ${100 - vsRataRata}% di bawah rata-rata nasional (${RATA_RATA_NASIONAL} kg/hari). Bagus!`
                      : `⚠️ Emisi kamu ${vsRataRata - 100}% di atas rata-rata nasional. Coba kurangi perjalanan!`}
                  </div>
                </div>

                {/* Rekomendasi */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Alternatif Transportasi</div>
                  <div className="space-y-2">
                    {rekomendasi.map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${i === 0 ? 'border-[#9FE1CB] bg-[#E1F5EE]' : 'border-gray-100'
                        }`}>
                        <span className="text-xl">{MODA_ICONS[i]}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">{r.moda}</div>
                          <div className="text-xs text-gray-400">
                            {r.estimasiWaktu} mnt · <span className="text-[#1D9E75]">{r.emisi} kg CO₂</span>
                          </div>
                        </div>
                        <div className="text-right mr-2">
                          <div className="text-xs text-[#1D9E75] font-medium">Hemat {r.hemat.toFixed(2)} kg</div>
                          <div className="text-xs text-amber-500">+{r.poin} poin</div>
                        </div>
                        <button
                          onClick={() => simpanModaAlternatif(MODA_BBM_KEYS[i], r.emisi, r.hemat, r.poin)}
                          disabled={saving}
                          className="shrink-0 text-xs bg-[#1D9E75] text-white px-3 py-1.5 rounded-lg hover:bg-[#0F6E56] transition-colors disabled:opacity-50">
                          Catat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {saveError && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ⚠️ {saveError}
                  </div>
                )}

                {/* Save button */}
                <button onClick={simpanTrip} disabled={saving || saved}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${saved
                    ? 'bg-green-50 text-[#1D9E75] border border-[#9FE1CB]'
                    : 'bg-[#1D9E75] text-white hover:bg-[#0F6E56]'
                    }`}>
                  {saving && <Spinner />}
                  {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan! +10 poin' : 'Simpan Perjalanan (+10 poin)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function KalkulatorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Spinner className="w-8 h-8 text-[#1D9E75]" /></div>}>
      <KalkulatorContent />
    </Suspense>
  )
}
