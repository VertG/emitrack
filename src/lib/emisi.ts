// Faktor emisi (kg CO₂ per liter) — sumber IPCC 2021 + ESDM RI
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

// Rekomendasikan moda transportasi alternatif
export function rekomendasiRute(emisiKendaraan: number, jarakKm: number) {
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
  ]
}
