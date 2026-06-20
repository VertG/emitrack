'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import LocationInput, { NominatimResult } from '@/components/LocationInput'
import { hitungEmisi, rekomendasiRute, Rekomendasi } from '@/lib/emisi'
import { hitungJarakKumulatif, validasiPerjalanan } from '@/lib/gps'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/Skeleton'
import { Search, Map, Leaf, Bike, Footprints, Navigation, Play, MapPinned, X } from 'lucide-react'
// MapClient must be dynamically imported with ssr: false to avoid window is not defined
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-2xl animate-pulse">Memuat Peta...</div>
})
const NavigationOverlay = dynamic(() => import('./NavigationOverlay'), { ssr: false })

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
  const [isFetchingRoute, setIsFetchingRoute] = useState(false)
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null)

  const [selectedModa, setSelectedModa] = useState<string | null>(null)
  const [petaTab, setPetaTab] = useState<'cari' | 'peta'>('cari')
  const [transitRuteOSRM, setTransitRuteOSRM] = useState<[number, number][] | null>(null)
  const [firstMileOSRM, setFirstMileOSRM] = useState<[number, number][] | null>(null)
  const [lastMileOSRM, setLastMileOSRM] = useState<[number, number][] | null>(null)

  // ── Navigation state ──
  const [isNavigating, setIsNavigating] = useState(false)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [walkedPath, setWalkedPath] = useState<[number, number][]>([])
  const [navWaktu, setNavWaktu] = useState(0) // detik
  const [navModa, setNavModa] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const navStartRef = useRef<number>(0)

  // ── Pick on map state ──
  const [pickMode, setPickMode] = useState<'asal' | 'tujuan' | null>(null)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
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

  // 1. Ambil data dari memory saat halaman Peta dimuat
  useEffect(() => {
    const savedAsal = sessionStorage.getItem('petaAsal');
    const savedTujuan = sessionStorage.getItem('petaTujuan');
    if (savedAsal) setAsal(JSON.parse(savedAsal));
    if (savedTujuan) setTujuan(JSON.parse(savedTujuan));
  }, []);

  // 2. Simpan data ke memory setiap kali user memilih lokasi baru
  useEffect(() => {
    if (asal) sessionStorage.setItem('petaAsal', JSON.stringify(asal));
    if (tujuan) sessionStorage.setItem('petaTujuan', JSON.stringify(tujuan));
  }, [asal, tujuan]);

  // ── Handle map click → reverse geocode → set asal/tujuan ──
  const handleMapClick = useCallback(async (latlng: [number, number]) => {
    if (!pickMode) return

    setIsReverseGeocoding(true)
    const lat = latlng[0].toString()
    const lon = latlng[1].toString()

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      const data = await res.json()
      const loc: NominatimResult = {
        lat,
        lon,
        display_name: data.display_name || `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
      }

      if (pickMode === 'asal') {
        setAsal(loc)
        // Auto-switch to tujuan pick if tujuan is not set
        if (!tujuan) {
          setPickMode('tujuan')
          setToast({ msg: 'Asal dipilih! Sekarang klik tujuan di peta.', type: 'success' })
          setTimeout(() => setToast(null), 2500)
        } else {
          setPickMode(null)
          setToast({ msg: 'Titik asal diperbarui!', type: 'success' })
          setTimeout(() => setToast(null), 2000)
        }
      } else {
        setTujuan(loc)
        setPickMode(null)
        setToast({ msg: 'Titik tujuan dipilih!', type: 'success' })
        setTimeout(() => setToast(null), 2000)
      }
    } catch {
      // Fallback tanpa nama
      const loc: NominatimResult = {
        lat,
        lon,
        display_name: `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
      }
      if (pickMode === 'asal') setAsal(loc)
      else setTujuan(loc)
      setPickMode(null)
    } finally {
      setIsReverseGeocoding(false)
    }
  }, [pickMode, tujuan])

  // Cleanup GPS watch and timer on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  async function fetchOSRM(start: NominatimResult, end: NominatimResult) {
    setIsFetchingRoute(true)
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
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Number(start.lat) * Math.PI / 180) * Math.cos(Number(end.lat) * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const jarakKasar = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
    } finally {
      setIsFetchingRoute(false)
    }
  }

  // Rekomendasi
  const asalLatLng: [number, number] | null = asal ? [Number(asal.lat), Number(asal.lon)] : null
  const tujuanLatLng: [number, number] | null = tujuan ? [Number(tujuan.lat), Number(tujuan.lon)] : null

  const emisiMobil = hitungEmisi('mobil', 'ron92', jarakKm)
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
      setIsFetchingRoute(true)
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
      } finally {
        setIsFetchingRoute(false)
      }
    }
  }

  // ── Navigation handlers ──

  const handleMulaiNavigasi = useCallback((rec: Rekomendasi) => {
    if (!navigator.geolocation) {
      setToast({ msg: 'Browser tidak mendukung GPS. Gunakan browser modern.', type: 'error' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setNavModa(rec.moda)
    setWalkedPath([])
    setNavWaktu(0)
    setIsNavigating(true)
    setIsValidating(false)
    navStartRef.current = Date.now()

    // Switch to peta tab on mobile
    setPetaTab('peta')

    // Start GPS watch
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserPosition(newPos)
        setWalkedPath(prev => {
          // Filter out positions that are too close (< 5m) to reduce noise
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            const R = 6371000 // meters
            const dLat = (newPos[0] - last[0]) * Math.PI / 180
            const dLon = (newPos[1] - last[1]) * Math.PI / 180
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(last[0] * Math.PI / 180) * Math.cos(newPos[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            if (dist < 5) return prev // Skip if moved less than 5m
          }
          return [...prev, newPos]
        })
      },
      (err) => {
        console.error('GPS error', err)
        if (err.code === err.PERMISSION_DENIED) {
          setToast({ msg: 'Izin GPS ditolak. Aktifkan lokasi di pengaturan browser.', type: 'error' })
          handleBatalNavigasi()
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    )
    watchIdRef.current = id

    // Start timer
    timerRef.current = setInterval(() => {
      setNavWaktu(Math.floor((Date.now() - navStartRef.current) / 1000))
    }, 1000)
  }, [])

  const handleBatalNavigasi = useCallback(() => {
    // Stop GPS watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Reset state
    setIsNavigating(false)
    setUserPosition(null)
    setWalkedPath([])
    setNavWaktu(0)
    setNavModa('')
    setIsValidating(false)
  }, [])

  const handleSelesaiNavigasi = useCallback(() => {
    if (!tujuanLatLng) return

    setIsValidating(true)

    // Small delay for UX
    setTimeout(() => {
      const hasil = validasiPerjalanan(walkedPath, jarakKm, tujuanLatLng)

      if (hasil.valid) {
        // Stop GPS and timer
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        const jarakAktual = hasil.jarakAktual
        
        // Determine jenis kendaraan for kalkulator
        const rec = rekomendasi.find(r => r.moda === navModa)
        const isPribadi = navModa.includes('Pribadi')
        const jenisKendaraan = navModa.toLowerCase().includes('motor') ? 'motor' 
          : navModa.toLowerCase().includes('mobil') ? 'mobil'
          : navModa.toLowerCase().includes('sepeda') ? 'sepeda'
          : navModa.toLowerCase().includes('krl') ? 'krl'
          : 'transjakarta'

        setToast({ msg: hasil.pesan, type: 'success' })
        
        // Reset navigation state
        setIsNavigating(false)
        setUserPosition(null)
        setWalkedPath([])
        setNavWaktu(0)
        setIsValidating(false)

        // Redirect to kalkulator with actual distance and navigation flag
        setTimeout(() => {
          router.push(`/kalkulator?jarak=${jarakAktual.toFixed(1)}&jenis=${jenisKendaraan}&dari-peta=1&navigasi=1`)
        }, 1500)
      } else {
        setToast({ msg: hasil.pesan, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        setIsValidating(false)
      }
    }, 800)
  }, [walkedPath, jarakKm, tujuanLatLng, navModa, rekomendasi, router])

  async function handleSimpanTrip(rec: Rekomendasi) {
    if (!user) return
    setIsSaving(true)

    try {
      const isKendaraanPribadi = rec.moda.includes('Pribadi')
      const jenisValue = isKendaraanPribadi
        ? (rec.moda.toLowerCase().includes('motor') ? 'motor' : 'mobil')
        : 'transportasi_umum'

      const bbmValue = isKendaraanPribadi
        ? 'ron92' // Default asumsi
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

  // Jarak yang sudah ditempuh berdasarkan GPS path
  const jarakDitempuh = hitungJarakKumulatif(walkedPath)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col md:flex-row md:p-6 md:gap-6 h-screen overflow-hidden">
        {/* ── Mobile tab switcher ── */}
        {!isNavigating && (
          <div className="md:hidden flex border-b border-gray-100 bg-white shrink-0">
            {(['cari', 'peta'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPetaTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${petaTab === tab ? 'text-[#1D9E75] border-b-2 border-[#1D9E75]' : 'text-gray-400'}`}
              >
                {tab === 'cari' ? <span className="flex items-center justify-center gap-2"><Search size={16} /> Cari Rute</span> : <span className="flex items-center justify-center gap-2"><Map size={16} /> Peta</span>}
              </button>
            ))}
          </div>
        )}

        {/* PANEL KIRI (Form & Rekomendasi) — hidden during navigation */}
        {!isNavigating && (
          <div className={`${petaTab === 'peta' ? 'hidden' : 'flex'} md:flex w-full md:w-[360px] flex-col gap-6 overflow-y-auto pb-20 md:pb-6 px-4 pt-4 md:px-0 md:pt-0 md:pr-2 custom-scrollbar`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <h1 className="text-lg font-bold text-gray-800">Rencanakan Rute</h1>
                {isFetchingRoute && <Spinner className="w-5 h-5 text-[#1D9E75]" />}
              </div>
              <p className="text-xs text-gray-500 mb-5">Cari rute dan lihat potensi penghematan CO₂.</p>

              <div className="space-y-4 relative">
                {/* Garis vertikal penghubung */}
                <div className="absolute left-2.5 top-8 bottom-8 w-0.5 bg-gray-100 z-0" />

                <div className="relative z-20 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E1F5EE] border-2 border-[#1D9E75] flex-shrink-0 mt-6" />
                  <div className="flex-1 flex gap-1.5">
                    <div className="flex-1">
                      <LocationInput label="Titik Asal" placeholder="Cari asal..." value={asal} onChange={setAsal} />
                    </div>
                    <button
                      onClick={() => { setPickMode(pickMode === 'asal' ? null : 'asal'); setPetaTab('peta') }}
                      title="Pilih di peta"
                      className={`mt-5 px-2 py-2 rounded-lg text-sm transition-colors flex-shrink-0 ${pickMode === 'asal' ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-500 hover:bg-[#E1F5EE] hover:text-[#1D9E75]'}`}
                    >
                      <MapPinned size={16} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fee2e2] border-2 border-[#ef4444] flex-shrink-0 mt-6" />
                  <div className="flex-1 flex gap-1.5">
                    <div className="flex-1">
                      <LocationInput label="Tujuan" placeholder="Cari tujuan..." value={tujuan} onChange={setTujuan} />
                    </div>
                    <button
                      onClick={() => { setPickMode(pickMode === 'tujuan' ? null : 'tujuan'); setPetaTab('peta') }}
                      title="Pilih di peta"
                      className={`mt-5 px-2 py-2 rounded-lg text-sm transition-colors flex-shrink-0 ${pickMode === 'tujuan' ? 'bg-[#ef4444] text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-[#ef4444]'}`}
                    >
                      <MapPinned size={16} />
                    </button>
                  </div>
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
                      className={`rounded-xl border p-4 shadow-sm relative overflow-hidden group transition-all cursor-pointer ${selectedModa === rec.moda ? 'bg-[#E1F5EE] border-[#1D9E75]' : 'bg-white border-gray-100 hover:border-[#1D9E75]'
                        }`}
                    >
                      {i === 0 && (
                        <div className="absolute top-0 right-0 bg-[#FAC775] text-[#085041] text-[10px] font-bold flex items-center px-3 py-1 rounded-bl-lg gap-1">
                          Terhijau <Leaf size={10} strokeWidth={3} className="text-[#085041]" />
                        </div>
                      )}
                      <div className="font-semibold text-gray-800 mb-2 mt-1 flex items-center gap-2">
                        {rec.moda}
                      </div>

                      {rec.isTooFar && (
                        <div className="text-xs text-red-500 font-medium mb-2">
                          Stasiun terlalu jauh ({Number(rec.firstMileKm! + rec.lastMileKm!).toFixed(1)} km — tidak realistis)
                        </div>
                      )}

                      {!rec.isTooFar && rec.firstMileMode === 'ride' && (
                        <div className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1.5">
                          <Bike size={14} /> Perlu ojek/motor ke stasiun ({Number(rec.firstMileKm! + rec.lastMileKm!).toFixed(2)} km first+last mile)
                        </div>
                      )}

                      {!rec.isTooFar && rec.stasiunAwal && (
                        <div className="text-[10px] text-gray-500 mb-3 bg-white/50 p-2 rounded border border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            {rec.firstMileMode === 'ride' ? <Bike size={12} className="shrink-0" /> : <Footprints size={12} className="shrink-0" />} {rec.firstMileMode === 'ride' ? 'Ojek' : 'Jalan'} {rec.firstMileKm} km ke {rec.stasiunAwal}
                          </div>
                          <div className="flex items-center gap-1.5 border-l border-gray-300 ml-0.5 pl-1.5 my-1 py-1">
                            <span className="text-blue-500 font-bold tracking-widest text-[8px]">|||</span> Transit {rec.transitKm} km
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            {rec.firstMileMode === 'ride' ? <Bike size={12} className="shrink-0" /> : <Footprints size={12} className="shrink-0" />} {rec.firstMileMode === 'ride' ? 'Ojek' : 'Jalan'} {rec.lastMileKm} km ke tujuan
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <div className="text-gray-400">Emisi</div>
                          <div className="font-medium text-[#1D9E75]">{rec.emisi} kg CO₂</div>
                        </div>
                        <div>
                          <div className="text-gray-400">
                            {rec.moda.includes('Mobil') ? 'Emisi Referensi' : 'Hemat vs Mobil'}
                          </div>
                          <div className="font-medium text-[#1D9E75]">
                            {rec.moda === 'Mobil Pribadi'
                              ? `${rec.emisi} kg CO₂`
                              : `${rec.hemat} kg CO₂`}
                          </div>
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

                      {/* Tombol Mulai Navigasi */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMulaiNavigasi(rec); }}
                        disabled={isSaving || rec.isTooFar}
                        className="w-full py-2.5 bg-[#1D9E75] text-white text-xs font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors disabled:opacity-50 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 flex items-center justify-center gap-2 shadow-md shadow-[#1D9E75]/20"
                      >
                        <Play size={14} fill="white" />
                        {rec.isTooFar ? 'Rute Tidak Valid' : 'Mulai Navigasi'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL KANAN (Map) — full screen during navigation */}
        <div className={`${!isNavigating && petaTab === 'cari' ? 'hidden' : 'flex'} md:flex flex-1 bg-white md:rounded-2xl border border-gray-100 overflow-hidden relative ${isNavigating ? 'h-screen md:h-auto' : 'h-[calc(100dvh-9rem)] md:h-auto'}`}>
          {toast && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-[#1D9E75] text-white' : 'bg-red-500 text-white'
              }`}>
              {toast.msg}
            </div>
          )}

          {/* Navigation Overlay */}
          {isNavigating && (
            <NavigationOverlay
              jarakDitempuh={jarakDitempuh}
              jarakRute={jarakKm}
              waktuDetik={navWaktu}
              modaLabel={navModa}
              onSelesai={handleSelesaiNavigasi}
              onBatal={handleBatalNavigasi}
              isValidating={isValidating}
            />
          )}

          {/* Pick mode banner */}
          {pickMode && !isNavigating && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
              <div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 ${pickMode === 'asal' ? 'bg-[#1D9E75] text-white' : 'bg-[#ef4444] text-white'}`}>
                {isReverseGeocoding ? (
                  <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
                ) : (
                  <><MapPinned size={14} /> Klik peta untuk pilih {pickMode === 'asal' ? 'titik asal' : 'tujuan'}</>
                )}
              </div>
              <button
                onClick={() => setPickMode(null)}
                className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <MapClient
            asal={asalLatLng}
            tujuan={tujuanLatLng}
            ruteOSRM={ruteOSRM}
            activeTransit={activeTransit}
            visible={petaTab === 'peta' || isNavigating}
            isNavigating={isNavigating}
            userPosition={userPosition}
            walkedPath={walkedPath}
            pickMode={pickMode}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  )
}
