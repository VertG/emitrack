'use client'

import { useEffect, useRef, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { rekomendasiRute, hitungEmisi } from '@/lib/emisi'

const LOKASI_PRESET: Record<string, [number, number]> = {
  'Sudirman, Jakarta': [-6.2088, 106.8228],
  'Kebayoran Baru, Jakarta': [-6.2441, 106.7955],
  'Kelapa Gading, Jakarta': [-6.1565, 106.9013],
  'Depok, Jawa Barat': [-6.4025, 106.7942],
  'Bekasi, Jawa Barat': [-6.2349, 106.9896],
  'Tangerang, Banten': [-6.1783, 106.6319],
  'Bogor, Jawa Barat': [-6.5971, 106.8060],
  'Bandung, Jawa Barat': [-6.9175, 107.6191],
  'Politeknik Astra, Bekasi': [-6.3157, 107.1455],
  'Monas, Jakarta': [-6.1754, 106.8272],
  'Blok M, Jakarta': [-6.2444, 106.7981],
  'Grogol, Jakarta': [-6.1676, 106.7884],
  'Cibubur, Jakarta': [-6.3624, 106.8961],
}

type Lokasi = { nama: string; koordinat: [number, number] }
type Rute = { moda: string; emisi: number; estimasiWaktu: number; hemat: number; poin: number; icon: string }

// Ambil rute jalan dari OSRM (gratis, no API key)
async function ambilRuteOSRM(dari: [number, number], ke: [number, number]) {
  const [lat1, lon1] = dari
  const [lat2, lon2] = ke
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error('OSRM error')
  const route = data.routes[0]
  return {
    // Koordinat rute jalan (array [lat, lng] untuk Leaflet)
    coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
    // Jarak dalam km
    jarakKm: Number((route.distance / 1000).toFixed(2)),
    // Durasi dalam menit
    durasiMenit: Math.round(route.duration / 60),
  }
}

export default function PetaPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)

  const [dari, setDari] = useState<Lokasi | null>(null)
  const [ke, setKe] = useState<Lokasi | null>(null)
  const [dariInput, setDariInput] = useState('')
  const [keInput, setKeInput] = useState('')
  const [dariSaran, setDariSaran] = useState<string[]>([])
  const [keSaran, setKeSaran] = useState<string[]>([])
  const [jarak, setJarak] = useState<number | null>(null)
  const [durasiMobil, setDurasiMobil] = useState<number | null>(null)
  const [rekomendasi, setRekomendasi] = useState<Rute[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loadingRute, setLoadingRute] = useState(false)
  const [errorRute, setErrorRute] = useState('')

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, { center: [-6.2088, 106.8456], zoom: 11 })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstance.current = map
      setMapReady(true)
    })

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return

    import('leaflet').then(async L => {
      const map = mapInstance.current

      // Hapus markers & polyline lama
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null }
      setJarak(null); setRekomendasi([]); setErrorRute('')

      const buatIcon = (warna: string) => L.divIcon({
        html: `<div style="background:${warna};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })

      if (dari) {
        markersRef.current.push(
          L.marker(dari.koordinat, { icon: buatIcon('#1D9E75') })
            .addTo(map).bindPopup(`<b>Dari:</b> ${dari.nama}`)
        )
      }

      if (ke) {
        markersRef.current.push(
          L.marker(ke.koordinat, { icon: buatIcon('#E24B4A') })
            .addTo(map).bindPopup(`<b>Ke:</b> ${ke.nama}`)
        )
      }

      if (dari && ke) {
        setLoadingRute(true)
        try {
          // Ambil rute jalan sesungguhnya dari OSRM
          const { coords, jarakKm, durasiMenit } = await ambilRuteOSRM(
            dari.koordinat, ke.koordinat
          )

          // Gambar rute jalan di peta
          const poly = L.polyline(coords, {
            color: '#1D9E75',
            weight: 4,
            opacity: 0.85,
          }).addTo(map)
          polylineRef.current = poly

          // Fit bounds ke rute
          map.fitBounds(poly.getBounds(), { padding: [40, 40] })

          setJarak(jarakKm)
          setDurasiMobil(durasiMenit)

          // Hitung rekomendasi
          const emisiMobil = hitungEmisi('mobil', 'pertalite', jarakKm)
          const rek = rekomendasiRute(emisiMobil, jarakKm)
          setRekomendasi(rek.map((r, i) => ({ ...r, icon: i === 0 ? '🚌' : i === 1 ? '🚆' : '🚲' })))
        } catch {
          setErrorRute('Gagal ambil rute. Cek koneksi internet.')
          // Fallback: gambar garis lurus
          const poly = L.polyline([dari.koordinat, ke.koordinat], {
            color: '#9ca3af', weight: 3, dashArray: '8 6',
          }).addTo(map)
          polylineRef.current = poly
          map.fitBounds([dari.koordinat, ke.koordinat], { padding: [40, 40] })
        }
        setLoadingRute(false)
      }
    })
  }, [dari, ke, mapReady])

  function cariLokasi(input: string, setter: (s: string[]) => void) {
    if (input.length < 2) { setter([]); return }
    setter(Object.keys(LOKASI_PRESET).filter(k => k.toLowerCase().includes(input.toLowerCase())).slice(0, 5))
  }

  function pilihDari(nama: string) { setDari({ nama, koordinat: LOKASI_PRESET[nama] }); setDariInput(nama); setDariSaran([]) }
  function pilihKe(nama: string) { setKe({ nama, koordinat: LOKASI_PRESET[nama] }); setKeInput(nama); setKeSaran([]) }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="font-medium text-gray-800">Peta & Rute Alternatif</div>
          <div className="text-xs text-gray-400">Powered by Leaflet + OpenStreetMap + OSRM Routing</div>
        </div>

        <div className="flex-1 flex gap-0">
          {/* Panel kiri */}
          <div className="w-80 bg-white border-r border-gray-100 flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto">

              {/* Input Dari */}
              <div className="mb-3 relative">
                <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] inline-block"></span> Dari
                </div>
                <input type="text" placeholder="Cari lokasi asal..." value={dariInput}
                  onChange={e => { setDariInput(e.target.value); cariLokasi(e.target.value, setDariSaran) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1D9E75]" />
                {dariSaran.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-lg shadow-md mt-1">
                    {dariSaran.map(s => (
                      <button key={s} onClick={() => pilihDari(s)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        📍 {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Ke */}
              <div className="mb-4 relative">
                <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span> Ke
                </div>
                <input type="text" placeholder="Cari lokasi tujuan..." value={keInput}
                  onChange={e => { setKeInput(e.target.value); cariLokasi(e.target.value, setKeSaran) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1D9E75]" />
                {keSaran.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-lg shadow-md mt-1">
                    {keSaran.map(s => (
                      <button key={s} onClick={() => pilihKe(s)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        📍 {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(dari || ke) && (
                <button onClick={() => { setDari(null); setKe(null); setDariInput(''); setKeInput(''); setJarak(null); setRekomendasi([]) }}
                  className="text-xs text-gray-400 hover:text-red-400 mb-4 transition-colors">
                  ✕ Reset lokasi
                </button>
              )}

              {/* Loading */}
              {loadingRute && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center text-sm text-gray-400 border border-gray-100">
                  🔄 Mengambil rute jalan...
                </div>
              )}

              {/* Error */}
              {errorRute && (
                <div className="bg-red-50 rounded-xl p-3 mb-4 text-xs text-red-500 border border-red-100">
                  ⚠️ {errorRute}
                </div>
              )}

              {/* Hasil */}
              {jarak !== null && !loadingRute && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-400">Jarak jalan</div>
                      <div className="text-xl font-medium text-[#1D9E75]">{jarak} km</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Waktu mobil</div>
                      <div className="text-xl font-medium text-gray-700">{durasiMobil} mnt</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2">via OSRM (rute jalan sesungguhnya)</div>
                </div>
              )}

              {/* Rekomendasi */}
              {rekomendasi.length > 0 && !loadingRute && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Pilihan Moda Transportasi</div>
                  <div className="space-y-2">
                    {rekomendasi.map((r, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${i === 0 ? 'border-[#9FE1CB] bg-[#E1F5EE]' : 'border-gray-100 bg-white'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{r.icon}</span>
                          <div className="flex-1 text-sm font-medium text-gray-700">{r.moda}</div>
                          {i === 0 && <span className="text-[10px] bg-[#1D9E75] text-white px-2 py-0.5 rounded-full">Terhijau</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="text-center">
                            <div className="text-xs font-medium text-[#1D9E75]">{r.emisi} kg</div>
                            <div className="text-[10px] text-gray-400">CO₂</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-600">{r.estimasiWaktu} mnt</div>
                            <div className="text-[10px] text-gray-400">estimasi</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium text-amber-500">+{r.poin} poin</div>
                            <div className="text-[10px] text-gray-400">reward</div>
                          </div>
                        </div>
                        {r.hemat > 0 && (
                          <div className="text-[11px] text-[#1D9E75] mt-2">
                            ✓ Hemat {r.hemat.toFixed(2)} kg CO₂ vs kendaraan pribadi
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!dari && !ke && (
                <div className="text-center py-8 text-gray-300">
                  <div className="text-3xl mb-2">🗺️</div>
                  <div className="text-sm">Ketik nama lokasi untuk mencari</div>
                  <div className="text-xs mt-1">Contoh: "Sudirman" atau "Bekasi"</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 leading-relaxed">
                🗺️ Peta: OpenStreetMap<br/>
                🛣️ Rute: OSRM (rute jalan asli)<br/>
                🚌 Rekomendasi: berdasarkan emisi CO₂
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full min-h-[600px]" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-sm text-gray-400">Memuat peta...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
