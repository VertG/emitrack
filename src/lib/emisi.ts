// Faktor emisi (kg CO₂ per liter) — sumber IPCC 2021 + ESDM RI
import { findNearestStation } from './stations'
export const FAKTOR_EMISI: Record<string, number> = {
  pertalite: 2.31,
  pertamax: 2.35,
  solar: 2.67,
  listrik: 0.85, // kg CO₂ per kWh (grid Indonesia)
}

// Konsumsi bahan bakar rata-rata (liter/km) — data ESDM RI
export const KONSUMSI: Record<string, number> = {
  motor_pertalite: 0.043,
  motor_pertamax: 0.040,
  mobil_pertalite: 0.120,
  mobil_pertamax: 0.115,
  mobil_solar: 0.095,
  mobil_listrik: 0.180, // kWh/km
}

// Rata-rata emisi nasional per hari (kg CO₂)
export const RATA_RATA_NASIONAL = 5.8

// Hitung emisi CO₂
export function hitungEmisi(jenis: string, bbm: string, jarakKm: number): number {
  const key = `${jenis}_${bbm}`
  const konsumsi = KONSUMSI[key] ?? 0.1
  const faktor = FAKTOR_EMISI[bbm] ?? 2.31
  return Number((jarakKm * konsumsi * faktor).toFixed(3))
}

// Hitung jarak dua koordinat - Rumus Haversine
export function hitungJarak(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2))
}

// Emisi transportasi umum (kg CO₂ per km)
export const EMISI_TRANSPUBLIK: Record<string, number> = {
  transjakarta: 0.008,
  mrt: 0.004,
  krl: 0.005,
  sepeda: 0,
}

export type Rekomendasi = {
  moda: string
  emisi: number
  estimasiWaktu: number
  hemat: number
  poin: number
  isTooFar?: boolean
  // Route details
  firstMileKm?: number
  transitKm?: number
  lastMileKm?: number
  stasiunAwal?: string
  stasiunAkhir?: string
  awalLat?: number
  awalLon?: number
  akhirLat?: number
  akhirLon?: number
}

// Rekomendasikan moda transportasi alternatif dengan segmentasi First-Mile / Transit / Last-Mile
export function rekomendasiRute(
  emisiKendaraan: number, 
  jarakKm: number, 
  asalLat?: number, asalLon?: number, 
  tujuanLat?: number, tujuanLon?: number
): Rekomendasi[] {
  // Fallback standar jika koordinat tidak diberikan
  if (!asalLat || !asalLon || !tujuanLat || !tujuanLon) {
    return [
      {
        moda: 'TransJakarta + MRT',
        emisi: Number((jarakKm * EMISI_TRANSPUBLIK.transjakarta).toFixed(3)),
        estimasiWaktu: Math.round(jarakKm * 3.5),
        hemat: Number((emisiKendaraan - jarakKm * EMISI_TRANSPUBLIK.transjakarta).toFixed(3)),
        poin: 50,
      },
      {
        moda: 'KRL',
        emisi: Number((jarakKm * EMISI_TRANSPUBLIK.krl).toFixed(3)),
        estimasiWaktu: Math.round(jarakKm * 4),
        hemat: Number((emisiKendaraan - jarakKm * EMISI_TRANSPUBLIK.krl).toFixed(3)),
        poin: 40,
      },
      {
        moda: 'Sepeda',
        emisi: 0,
        estimasiWaktu: Math.round(jarakKm * 6),
        hemat: emisiKendaraan,
        poin: 80,
      },
    ].sort((a,b) => a.emisi - b.emisi)
  }

  // Hitung dengan Stasiun Statis
  const tjStart = findNearestStation(asalLat, asalLon, ['tj', 'mrt'])
  const tjEnd = findNearestStation(tujuanLat, tujuanLon, ['tj', 'mrt'])
  
  const krlStart = findNearestStation(asalLat, asalLon, ['krl'])
  const krlEnd = findNearestStation(tujuanLat, tujuanLon, ['krl'])

  const results: Rekomendasi[] = []

  const buildTransit = (
    modaLabel: string, 
    startSt: NonNullable<ReturnType<typeof findNearestStation>>, 
    endSt: NonNullable<ReturnType<typeof findNearestStation>>, 
    emisiPerKm: number
  ) => {
     const transitKm = hitungJarak(startSt.station.lat, startSt.station.lon, endSt.station.lat, endSt.station.lon)
     const firstMile = startSt.distKm
     const lastMile = endSt.distKm
     
     if (startSt.station.id === endSt.station.id) return null

     const isTooFar = firstMile > 5 || lastMile > 5
     const totalKm = firstMile + transitKm + lastMile
     const emisi = Number((transitKm * emisiPerKm).toFixed(3)) // emisi jalan kaki = 0
     const hemat = Number((emisiKendaraan - emisi).toFixed(3))
     const waktu = Math.round(firstMile * 12 + transitKm * 3.5 + lastMile * 12)

     return {
       moda: modaLabel,
       emisi,
       estimasiWaktu: waktu,
       hemat: Math.max(0, hemat),
       poin: modaLabel.includes('TransJakarta') ? 50 : 40,
       isTooFar,
       firstMileKm: firstMile,
       transitKm: Number(transitKm.toFixed(2)),
       lastMileKm: lastMile,
       stasiunAwal: startSt.station.name,
       stasiunAkhir: endSt.station.name,
       awalLat: startSt.station.lat,
       awalLon: startSt.station.lon,
       akhirLat: endSt.station.lat,
       akhirLon: endSt.station.lon
     }
  }

  if (tjStart && tjEnd) {
    const r = buildTransit('TransJakarta + MRT', tjStart, tjEnd, EMISI_TRANSPUBLIK.transjakarta)
    if (r) results.push(r)
  }

  if (krlStart && krlEnd) {
    const r = buildTransit('KRL Commuter', krlStart, krlEnd, EMISI_TRANSPUBLIK.krl)
    if (r) results.push(r)
  }

  results.push({
    moda: 'Sepeda',
    emisi: 0,
    estimasiWaktu: Math.round(jarakKm * 6),
    hemat: emisiKendaraan,
    poin: 80,
  })

  // Tambahkan opsi kendaraan pribadi agar user tetap bisa mencatatnya
  const emisiMotor = Number((jarakKm * FAKTOR_EMISI.pertalite / KONSUMSI.motor).toFixed(3))
  results.push({
    moda: 'Motor Pribadi',
    emisi: emisiMotor,
    estimasiWaktu: Math.round(jarakKm * 2.5),
    hemat: Math.max(0, Number((emisiKendaraan - emisiMotor).toFixed(3))), // Dibandingkan dengan mobil
    poin: 10, // Poin minimal
  })

  results.push({
    moda: 'Mobil Pribadi',
    emisi: emisiKendaraan,
    estimasiWaktu: Math.round(jarakKm * 3.5),
    hemat: 0,
    poin: 5,
  })

  return results.sort((a,b) => a.emisi - b.emisi)
}
