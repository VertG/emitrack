'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { hitungEmisi, RATA_RATA_NASIONAL, rekomendasiRute } from '@/lib/emisi'
import Sidebar from '@/components/Sidebar'

const JENIS_KENDARAAN = [
  { value: 'motor', label: 'Motor' },
  { value: 'mobil', label: 'Mobil' },
]

const MODA_BBM_KEYS = ['transjakarta', 'krl', 'sepeda']
const MODA_ICONS = ['🚌', '🚆', '🚲']

const BBM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  motor: [
    { value: 'pertalite', label: 'Pertalite' },
    { value: 'pertamax', label: 'Pertamax' },
  ],
  mobil: [
    { value: 'pertalite', label: 'Pertalite' },
    { value: 'pertamax', label: 'Pertamax' },
    { value: 'solar', label: 'Solar' },
    { value: 'listrik', label: 'Listrik (EV)' },
  ],
}

export default function KalkulatorPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [jenis, setJenis] = useState('motor')
  const [bbm, setBbm] = useState('pertalite')
  const [jarak, setJarak] = useState(20)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  const emisiHarian = hitungEmisi(jenis, bbm, jarak)
  const emisiBulanan = Number((emisiHarian * 22).toFixed(1))
  const emisiTahunan = Number((emisiHarian * 264).toFixed(0))
  const vsRataRata = Number(((emisiHarian / RATA_RATA_NASIONAL) * 100).toFixed(0))
  const rekomendasi = rekomendasiRute(emisiHarian, jarak)

  async function upsertProfile(tambahPoin: number, tambahHemat: number) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_poin, total_hemat')
      .eq('id', user!.id)
      .single()
    await supabase
      .from('profiles')
      .update({
        total_poin: (profile?.total_poin ?? 0) + tambahPoin,
        total_hemat: (profile?.total_hemat ?? 0) + tambahHemat,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user!.id)
  }

  async function simpanTrip() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    setSaveError('')

    // Hitung penghematan vs rata-rata nasional (floored ke 0)
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

    await upsertProfile(10, emisiDihemat)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function simpanModaAlternatif(bbmKey: string, emisiModa: number, hemat: number, poin: number) {
    if (!user) return
    setSaving(true)
    setSaved(false)
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

    await upsertProfile(poin, emisiDihemat)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="font-medium text-gray-800">Kalkulator Emisi</div>
          <div className="text-xs text-gray-400">Berbasis data IPCC 2021 + ESDM RI</div>
        </div>

        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Form kiri */}
            <div className="space-y-4">
              {/* Jenis kendaraan */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Jenis Kendaraan</div>
                <div className="flex gap-2">
                  {JENIS_KENDARAAN.map(k => (
                    <button key={k.value} onClick={() => { setJenis(k.value); setBbm('pertalite') }}
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
                <div className="flex gap-2 flex-wrap">
                  {BBM_OPTIONS[jenis].map(b => (
                    <button key={b.value} onClick={() => setBbm(b.value)}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${bbm === b.value
                          ? 'bg-[#E1F5EE] text-[#085041] border border-[#9FE1CB]'
                          : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                        }`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jarak */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium text-gray-700">Jarak Tempuh Harian</div>
                  <div className="text-lg font-medium text-amber-600">{jarak} km</div>
                </div>
                <input type="range" min={1} max={100} step={1} value={jarak}
                  onChange={e => setJarak(Number(e.target.value))}
                  className="w-full accent-[#1D9E75]" />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>1 km</span><span>100 km</span>
                </div>
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
              <button onClick={simpanTrip} disabled={saving}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${saved
                    ? 'bg-green-50 text-[#1D9E75] border border-[#9FE1CB]'
                    : 'bg-[#1D9E75] text-white hover:bg-[#0F6E56]'
                  }`}>
                {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan! +10 poin' : 'Simpan Perjalanan (+10 poin)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
