'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import LocationInput, { NominatimResult } from '@/components/LocationInput'
import { hitungEmisi, rekomendasiRute, Rekomendasi } from '@/lib/emisi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// MapClient must be dynamically imported with ssr: false to avoid window is not defined
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-2xl animate-pulse">Memuat Peta...</div>
})

export default function PetaPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [asal, setAsal] = useState<NominatimResult | null>(null)
  const [tujuan, setTujuan] = useState<NominatimResult | null>(null)
  
  const [ruteOSRM, setRuteOSRM] = useState<[number, number][] | null>(null)
  const [jarakKm, setJarakKm] = useState(0)
  const [durasiMenit, setDurasiMenit] = useState(0)
  const [osrmError, setOsrmError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null)

  const [selectedModa, setSelectedModa] = useState<string | null>(null)
  const [transitRuteOSRM, setTransitRuteOSRM] = useState<[number, number][] | null>(null)
  const [firstMileOSRM, setFirstMileOSRM] = useState<[number, number][] | null>(null)
  const [lastMileOSRM, setLastMileOSRM] = useState<[number, number][] | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (asal && tujuan) {
      fetchOSRM(asal, tujuan)
    } else {
      setRuteOSRM(null)
      setTransitRuteOSRM(null)
      setFirstMileOSRM(null)
      setLastMileOSRM(null)
      setSelectedModa(null)
      setJarakKm(0)
      setDurasiMenit(0)
      setOsrmError(false)
    }
  }, [asal, tujuan])

  async function fetchOSRM(start: NominatimResult, end: NominatimResult) {
    try {
      setOsrmError(false)
      // OSRM format: lon,lat
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`
      )
      const data = await res.json()
      
      if (data.code !== 'Ok') {
        setOsrmError(true)
        setRuteOSRM(null)
        // Fallback hitung jarak kasar lurus
        const R = 6371
        const dLat = (Number(end.lat) - Number(start.lat)) * Math.PI / 180
        const dLon = (Number(end.lon) - Number(start.lon)) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(Number(start.lat) * Math.PI / 180) * Math.cos(Number(end.lat) * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
        const jarakKasar = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        setJarakKm(Number(jarakKasar.toFixed(1)))
        return
      }

      const route = data.routes[0]
      // GeoJSON has coordinates as [lon, lat]
      const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number])
      
      setRuteOSRM(coords)
      setJarakKm(Number((route.distance / 1000).toFixed(1)))
      setDurasiMenit(Math.round(route.duration / 60))
    } catch (err) {
      console.error('OSRM fail', err)
      setOsrmError(true)
      setRuteOSRM(null)
    }
  }

  // Rekomendasi
  const asalLatLng: [number, number] | null = asal ? [Number(asal.lat), Number(asal.lon)] : null
  const tujuanLatLng: [number, number] | null = tujuan ? [Number(tujuan.lat), Number(tujuan.lon)] : null

  const emisiMobil = hitungEmisi('mobil', 'pertalite', jarakKm)
  const rekomendasi = jarakKm > 0 && asalLatLng && tujuanLatLng
    ? rekomendasiRute(emisiMobil, jarakKm, asalLatLng[0], asalLatLng[1], tujuanLatLng[0], tujuanLatLng[1]) 
    : []

  async function handleSelectModa(rec: Rekomendasi) {
    if (rec.moda === 'Sepeda') {
      setSelectedModa('Sepeda')
      setTransitRuteOSRM(null)
      setFirstMileOSRM(null)
      setLastMileOSRM(null)
      return
    }

    if (selectedModa === rec.moda) {
       setSelectedModa(null)
       setTransitRuteOSRM(null)
       setFirstMileOSRM(null)
       setLastMileOSRM(null)
       return
    }

    setSelectedModa(rec.moda)
    if (rec.awalLon && rec.awalLat && rec.akhirLon && rec.akhirLat && asalLatLng && tujuanLatLng) {
      try {
        const [resTransit, resFirst, resLast] = await Promise.all([
          fetch(`https://router.project-osrm.org/route/v1/driving/${rec.awalLon},${rec.awalLat};${rec.akhirLon},${rec.akhirLat}?overview=full&geometries=geojson`),
          fetch(`https://router.project-osrm.org/route/v1/foot/${asalLatLng[1]},${asalLatLng[0]};${rec.awalLon},${rec.awalLat}?overview=full&geometries=geojson`),
          fetch(`https://router.project-osrm.org/route/v1/foot/${rec.akhirLon},${rec.akhirLat};${tujuanLatLng[1]},${tujuanLatLng[0]}?overview=full&geometries=geojson`)
        ])
        
        const dataTransit = await resTransit.json()
        const dataFirst = await resFirst.json()
        const dataLast = await resLast.json()

        if (dataTransit.code === 'Ok') setTransitRuteOSRM(dataTransit.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]))
        else setTransitRuteOSRM(null)

        if (dataFirst.code === 'Ok') setFirstMileOSRM(dataFirst.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]))
        else setFirstMileOSRM(null)

        if (dataLast.code === 'Ok') setLastMileOSRM(dataLast.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]))
        else setLastMileOSRM(null)
      } catch {
        setTransitRuteOSRM(null)
        setFirstMileOSRM(null)
        setLastMileOSRM(null)
      }
    }
  }

  async function handleSimpanTrip(rec: Rekomendasi) {
    if (!user) return
    setIsSaving(true)

    try {
      const isKendaraanPribadi = rec.moda.includes('Pribadi')
      const jenisValue = isKendaraanPribadi 
        ? (rec.moda.toLowerCase().includes('motor') ? 'motor' : 'mobil') 
        : 'transportasi_umum'
        
      const bbmValue = isKendaraanPribadi 
        ? 'pertalite' // Default asumsi
        : rec.moda.toLowerCase().includes('sepeda') 
          ? 'sepeda' 
          : rec.moda.toLowerCase().includes('krl') ? 'krl' : 'transjakarta'

      const emisiDihemat = isKendaraanPribadi ? 0 : Math.max(0, emisiMobil - rec.emisi)

      const { error: tripErr } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          jenis: jenisValue,
          bbm: bbmValue,
          jarak_km: jarakKm,
          emisi_kg: rec.emisi,
          emisi_dihemat: Number(emisiDihemat.toFixed(3)),
          poin_didapat: rec.poin,
        })

      if (tripErr) throw tripErr

      // Update Profile Poin
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_poin: (profile.total_poin ?? 0) + rec.poin,
            total_hemat: Number(((profile.total_hemat ?? 0) + emisiDihemat).toFixed(2)),
          })
          .eq('id', user.id)
      }

      setToast({ msg: 'Berhasil menyimpan perjalanan hijau!', type: 'success' })
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err: any) {
      setToast({ msg: 'Gagal menyimpan: ' + err.message, type: 'error' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const activeRec = rekomendasi.find(r => r.moda === selectedModa)
  const activeTransit = activeRec && activeRec.awalLat && activeRec.akhirLat ? {
    awalLat: activeRec.awalLat,
    awalLon: activeRec.awalLon!,
    akhirLat: activeRec.akhirLat,
    akhirLon: activeRec.akhirLon!,
    ruteTransitOSRM: transitRuteOSRM,
    ruteFirstMileOSRM: firstMileOSRM,
    ruteLastMileOSRM: lastMileOSRM
  } : null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex p-6 gap-6 h-screen overflow-hidden">
        {/* PANEL KIRI (Form & Rekomendasi) */}
        <div className="w-[360px] flex flex-col gap-6 overflow-y-auto pr-2 pb-6 custom-scrollbar">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h1 className="text-lg font-bold text-gray-800 mb-1">Rencanakan Rute</h1>
            <p className="text-xs text-gray-500 mb-5">Cari rute dan lihat potensi penghematan CO₂.</p>
            
            <div className="space-y-4 relative">
              {/* Garis vertikal penghubung */}
              <div className="absolute left-2.5 top-8 bottom-8 w-0.5 bg-gray-100 z-0" />
              
              <div className="relative z-20 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E1F5EE] border-2 border-[#1D9E75] flex-shrink-0 mt-6" />
                <LocationInput label="Titik Asal" placeholder="Cari asal..." value={asal} onChange={setAsal} />
              </div>

              <div className="relative z-10 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#fee2e2] border-2 border-[#ef4444] flex-shrink-0 mt-6" />
                <LocationInput label="Tujuan" placeholder="Cari tujuan..." value={tujuan} onChange={setTujuan} />
              </div>
            </div>

            {jarakKm > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Estimasi Jarak</div>
                  <div className="font-semibold text-gray-800">{jarakKm} km</div>
                </div>
                {durasiMenit > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Waktu Tempuh Mobil</div>
                    <div className="font-semibold text-gray-800">{durasiMenit} menit</div>
                  </div>
                )}
              </div>
            )}
            
            {osrmError && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg">
                Gagal mengambil rute jalan. Menampilkan garis lurus (jarak udara).
              </div>
            )}
          </div>

          {/* REKOMENDASI PANEL */}
          {jarakKm > 0 && (
            <div>
              <div className="text-sm font-bold text-gray-800 mb-3 px-1">Rekomendasi Transportasi Umum</div>
              <div className="space-y-3">
                {rekomendasi.map((rec, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSelectModa(rec)}
                    className={`rounded-xl border p-4 shadow-sm relative overflow-hidden group transition-all cursor-pointer ${
                      selectedModa === rec.moda ? 'bg-[#E1F5EE] border-[#1D9E75]' : 'bg-white border-gray-100 hover:border-[#1D9E75]'
                    }`}
                  >
                    {i === 0 && (
                      <div className="absolute top-0 right-0 bg-[#FAC775] text-[#085041] text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                        Terhijau 🌱
                      </div>
                    )}
                    <div className="font-semibold text-gray-800 mb-2 mt-1 flex items-center gap-2">
                      {rec.moda}
                    </div>

                    {rec.isTooFar && (
                      <div className="text-xs text-red-500 font-medium mb-2">
                        Stasiun terlalu jauh ({(rec.firstMileKm! + rec.lastMileKm!).toFixed(1)} km jalan kaki)
                      </div>
                    )}
                    
                    {!rec.isTooFar && rec.stasiunAwal && (
                      <div className="text-[10px] text-gray-500 mb-3 bg-white/50 p-2 rounded border border-gray-100">
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Jalan {rec.firstMileKm} km ke {rec.stasiunAwal}</div>
                        <div className="flex items-center gap-1.5 border-l border-gray-300 ml-0.5 pl-1.5 my-1 py-1"><span className="text-blue-500 font-bold tracking-widest text-[8px]">|||</span> Transit {rec.transitKm} km</div>
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"/> Jalan {rec.lastMileKm} km ke tujuan</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <div className="text-gray-400">Emisi</div>
                        <div className="font-medium text-[#1D9E75]">{rec.emisi} kg CO₂</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Hemat vs Mobil</div>
                        <div className="font-medium text-[#1D9E75]">{rec.hemat} kg CO₂</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Waktu Est.</div>
                        <div className="font-medium text-gray-700">{rec.estimasiWaktu} menit</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Reward</div>
                        <div className="font-medium text-[#FAC775]">+{rec.poin} poin</div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSimpanTrip(rec); }}
                      disabled={isSaving || rec.isTooFar}
                      className="w-full py-2 bg-gray-50 text-[#1D9E75] text-xs font-semibold rounded-lg hover:bg-[#1D9E75] hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-gray-50 disabled:hover:text-[#1D9E75]"
                    >
                      {isSaving ? 'Menyimpan...' : rec.isTooFar ? 'Rute Tidak Valid' : 'Pilih & Simpan Trip'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PANEL KANAN (Map) */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden relative">
          {toast && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success' ? 'bg-[#1D9E75] text-white' : 'bg-red-500 text-white'
            }`}>
              {toast.msg}
            </div>
          )}
          <MapClient asal={asalLatLng} tujuan={tujuanLatLng} ruteOSRM={ruteOSRM} activeTransit={activeTransit} />
        </div>
      </div>
    </div>
  )
}
