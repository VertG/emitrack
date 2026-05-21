// Faktor emisi (kg CO₂ per liter) — sumber IPCC 2021 + ESDM RI
import { findNearestStation, canTransfer } from './stations'
// Faktor emisi (kg CO₂ per liter) — sumber IPCC 2021
// Nilai berdasarkan kandungan karbon, tidak berbeda antar merek
export const FAKTOR_EMISI: Record<string, number> = {
  ron90:   2.30,  // Pertalite, Shell Regular, Vivo Revvo 90, dll
  ron92:   2.31,  // Pertamax, Shell Super, Total Performance 92, dll
  ron95:   2.33,  // Pertamax Green 95, Shell V-Power, Total Performance 95, dll
  ron98:   2.35,  // Pertamax Turbo, Shell V-Power Nitro+, dll
  diesel48: 2.67, // Biosolar (CN48), Solar biasa
  diesel51: 2.65, // Dexlite (CN51)
  diesel53: 2.63, // Pertadex, Shell Diesel, (CN53)
  listrik:  0.85, // kWh — grid Indonesia (RUPTL PLN 2023)
}

// Konsumsi rata-rata (liter/km) — sumber ESDM RI + BPPT
// RON lebih tinggi = efisiensi sedikit lebih baik
export const KONSUMSI: Record<string, number> = {
  // Motor
  motor_ron90:    0.045,
  motor_ron92:    0.043,
  motor_ron95:    0.041,
  motor_ron98:    0.040,
  motor_listrik:  0.020, // kWh/km

  // Mobil bensin
  mobil_ron90:    0.125,
  mobil_ron92:    0.120,
  mobil_ron95:    0.115,
  mobil_ron98:    0.110,

  // Mobil diesel
  mobil_diesel48: 0.095,
  mobil_diesel51: 0.092,
  mobil_diesel53: 0.090,

  // Mobil listrik
  mobil_listrik:  0.180, // kWh/km
}

// Label display untuk setiap opsi BBM
export const LABEL_BBM: Record<string, string> = {
  ron90:    'RON 90',
  ron92:    'RON 92',
  ron95:    'RON 95',
  ron98:    'RON 98',
  diesel48: 'Solar (CN 48)',
  diesel51: 'Dexlite (CN 51)',
  diesel53: 'Diesel Premium (CN 53)',
  listrik:  'Listrik',
  // Fallbacks for legacy data in DB
  pertalite: 'RON 90 (Pertalite)',
  pertamax:  'RON 92 (Pertamax)',
  solar:     'Solar (CN 48)',
}

// Contoh merek per RON (untuk tooltip/info)
export const CONTOH_MEREK: Record<string, string> = {
  ron90:    'Pertalite, Shell Regular, Vivo Revvo 90',
  ron92:    'Pertamax, Shell Super, Total Performance 92, BP 92',
  ron95:    'Pertamax Green 95, Shell V-Power, Total Eco Plus',
  ron98:    'Pertamax Turbo, Shell V-Power Nitro+',
  diesel48: 'Biosolar, Solar subsidi',
  diesel51: 'Dexlite, Shell Diesel Extra',
  diesel53: 'Pertadex, Shell Diesel Premium',
  listrik:  'Semua kendaraan listrik',
  // Fallbacks for legacy data
  pertalite: 'Pertalite, Shell Regular, Vivo Revvo 90',
  pertamax:  'Pertamax, Shell Super, Total Performance 92, BP 92',
  solar:     'Biosolar, Solar subsidi',
}

// Opsi BBM per jenis kendaraan
export const BBM_OPTIONS: Record<string, string[]> = {
  motor: ['ron90', 'ron92', 'ron95', 'ron98', 'listrik'],
  mobil: ['ron90', 'ron92', 'ron95', 'ron98', 
          'diesel48', 'diesel51', 'diesel53', 'listrik'],
}

// Rata-rata emisi nasional per hari (kg CO₂)
export const RATA_RATA_NASIONAL = 5.8

// Hitung emisi CO₂
// export function hitungEmisi(jenis: string, bbm: string, jarakKm: number): number {
//   const key = `${jenis}_${bbm}`
//   const konsumsi = KONSUMSI[key] ?? 0.1
//   const faktor = FAKTOR_EMISI[bbm] ?? 2.31
//   return Number((jarakKm * konsumsi * faktor).toFixed(3))
// }
export function hitungEmisi(jenis: string, bbm: string, jarakKm: number): number {
  if (!jarakKm || isNaN(jarakKm)) return 0;
  
  // Normalisasi string untuk mencegah typo atau spasi tersembunyi
  const jenisSafe = (jenis || 'motor').toLowerCase().replace(' pribadi', '').trim(); 
  const bbmSafe = (bbm || 'ron92').toLowerCase().trim();
  
  const key = `${jenisSafe}_${bbmSafe}`;
  
  // Gunakan || (OR) alih-alih ?? agar jika undefined/0 langsung pakai nilai default
  const konsumsi = KONSUMSI[key] || 0.1; 
  // Pengaman khusus untuk listrik jika object FAKTOR_EMISI belum sempurna
  const faktor = FAKTOR_EMISI[bbmSafe] || (bbmSafe.includes('listrik') ? 0.85 : 2.31); 
  
  const hasil = jarakKm * konsumsi * faktor;
  
  // Pencegahan final agar UI tidak pernah menampilkan NaN
  return isNaN(hasil) ? 0 : Number(hasil.toFixed(3));
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
  lrt: 0.006,
  sepeda: 0,
}

/**
 * Poin reward per moda — makin rendah emisi makin tinggi poin
 * Sepeda=100, KRL+MRT=70, MRT=65, KRL+LRT=60, KRL=55, LRT=50, TJ=45, Motor=15, Mobil=5
 */
export const POIN_REWARD: Record<string, number> = {
  'Sepeda': 100,
  'KRL + MRT': 70,
  'MRT': 65,
  'KRL + LRT': 60,
  'KRL Commuter': 55,
  'LRT Jabodebek': 50,
  'TransJakarta + MRT': 45,
  'Motor Pribadi': 15,
  'Mobil Pribadi': 5,
}

function getPoin(modaLabel: string): number {
  // Cek exact match dulu
  if (POIN_REWARD[modaLabel] !== undefined) return POIN_REWARD[modaLabel]
  // Fallback pattern matching
  if (modaLabel.includes('Sepeda')) return 100
  if (modaLabel.includes('KRL') && modaLabel.includes('MRT')) return 70
  if (modaLabel.includes('KRL') && modaLabel.includes('LRT')) return 60
  if (modaLabel.includes('KRL')) return 55
  if (modaLabel.includes('MRT')) return 65
  if (modaLabel.includes('LRT')) return 50
  if (modaLabel.includes('TransJakarta')) return 45
  return 30
}

export type Rekomendasi = {
  moda: string
  emisi: number
  estimasiWaktu: number
  hemat: number
  poin: number
  isTooFar?: boolean
  firstMileMode?: 'walk' | 'ride' // walk = < 2km, ride = perlu ojek/motor
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
    ].sort((a, b) => a.emisi - b.emisi)
  }

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

    // isTooFar: hanya true jika > 25 km (sangat tidak realistis bahkan dengan ojek)
    const isTooFar = firstMile > 25 || lastMile > 25
    // firstMileMode: jika < 2 km bisa jalan kaki, 2-25 km perlu ojek/motor
    const firstMileMode: 'walk' | 'ride' = (firstMile <= 2 && lastMile <= 2) ? 'walk' : 'ride'
    const totalKm = firstMile + transitKm + lastMile
    const emisi = Number((transitKm * emisiPerKm).toFixed(3)) // emisi jalan kaki = 0
    const hemat = Number((emisiKendaraan - emisi).toFixed(3))
    const waktu = Math.round(firstMile * 12 + transitKm * 3.5 + lastMile * 12)

    // Poin proporsional:
    // - Jika jalan kaki ke stasiun (<2km): dapat poin penuh
    // - Jika naik ojek/motor ke stasiun: poin dikurangi proporsional sesuai porsi perjalanan hijau
    //   Rumus: basePoin * (transitKm / totalKm), minimal 50% dari base
    const basePoin = getPoin(modaLabel)
    const poinFinal = firstMileMode === 'walk'
      ? basePoin
      : Math.max(Math.round(basePoin * (transitKm / Math.max(totalKm, 1))), Math.round(basePoin * 0.5))

    return {
      moda: modaLabel,
      emisi,
      estimasiWaktu: waktu,
      hemat: Math.max(0, hemat),
      poin: poinFinal,
      isTooFar,
      firstMileMode,
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

  // --- TransJakarta + MRT ---
  const tjStart = findNearestStation(asalLat, asalLon, ['tj', 'mrt'])
  const tjEnd = findNearestStation(tujuanLat, tujuanLon, ['tj', 'mrt'])
  if (tjStart && tjEnd) {
    const r = buildTransit('TransJakarta + MRT', tjStart, tjEnd, EMISI_TRANSPUBLIK.transjakarta)
    if (r) results.push(r)
  }

  // --- KRL Commuter ---
  const krlStart = findNearestStation(asalLat, asalLon, ['krl'])
  const krlEnd = findNearestStation(tujuanLat, tujuanLon, ['krl'])
  if (krlStart && krlEnd) {
    const r = buildTransit('KRL Commuter', krlStart, krlEnd, EMISI_TRANSPUBLIK.krl)
    if (r) results.push(r)

    // --- KRL + Transfer MRT ---
    // Cek apakah stasiun akhir KRL bisa transfer ke MRT (mis. Sudirman → Dukuh Atas MRT)
    const mrtEnd = findNearestStation(tujuanLat, tujuanLon, ['mrt'])
    if (mrtEnd && canTransfer(krlEnd.station, mrtEnd.station)) {
      // Rute: first-mile → KRL → transfer MRT → last-mile
      const krlTransitKm = hitungJarak(krlStart.station.lat, krlStart.station.lon, krlEnd.station.lat, krlEnd.station.lon)
      const mrtTransitKm = hitungJarak(mrtEnd.station.lat, mrtEnd.station.lon, tujuanLat, tujuanLon)
      const emisiKombinasi = Number((
        krlTransitKm * EMISI_TRANSPUBLIK.krl +
        mrtTransitKm * EMISI_TRANSPUBLIK.mrt
      ).toFixed(3))
      const firstMile = krlStart.distKm
      const lastMile = mrtEnd.distKm
      const isTooFar = firstMile > 25 || lastMile > 25
      const firstMileMode: 'walk' | 'ride' = (firstMile <= 2 && lastMile <= 2) ? 'walk' : 'ride'
      const waktu = Math.round(firstMile * 12 + krlTransitKm * 3.5 + 5 + mrtTransitKm * 2 + lastMile * 12)
      results.push({
        moda: 'KRL + MRT',
        emisi: emisiKombinasi,
        estimasiWaktu: waktu,
        hemat: Math.max(0, Number((emisiKendaraan - emisiKombinasi).toFixed(3))),
        poin: 60,
        isTooFar,
        firstMileMode,
        firstMileKm: firstMile,
        transitKm: Number((krlTransitKm + mrtTransitKm).toFixed(2)),
        lastMileKm: lastMile,
        stasiunAwal: krlStart.station.name,
        stasiunAkhir: mrtEnd.station.name,
        awalLat: krlStart.station.lat,
        awalLon: krlStart.station.lon,
        akhirLat: mrtEnd.station.lat,
        akhirLon: mrtEnd.station.lon,
      })
    }

    // --- KRL + Transfer LRT ---
    // Cek apakah stasiun KRL bisa transfer ke LRT (mis. Bekasi → LRT Bekasi Barat)
    const lrtEndKRL = findNearestStation(tujuanLat, tujuanLon, ['lrt'])
    if (lrtEndKRL && canTransfer(krlEnd.station, lrtEndKRL.station)) {
      const krlTransitKm2 = hitungJarak(krlStart.station.lat, krlStart.station.lon, krlEnd.station.lat, krlEnd.station.lon)
      const lrtTransitKm = hitungJarak(lrtEndKRL.station.lat, lrtEndKRL.station.lon, tujuanLat, tujuanLon)
      const emisiKombinasiLRT = Number((
        krlTransitKm2 * EMISI_TRANSPUBLIK.krl +
        lrtTransitKm * EMISI_TRANSPUBLIK.lrt
      ).toFixed(3))
      const firstMile2 = krlStart.distKm
      const lastMile2 = lrtEndKRL.distKm
      const isTooFar2 = firstMile2 > 25 || lastMile2 > 25
      const firstMileMode2: 'walk' | 'ride' = (firstMile2 <= 2 && lastMile2 <= 2) ? 'walk' : 'ride'
      const waktu2 = Math.round(firstMile2 * 12 + krlTransitKm2 * 3.5 + 5 + lrtTransitKm * 2.5 + lastMile2 * 12)
      results.push({
        moda: 'KRL + LRT',
        emisi: emisiKombinasiLRT,
        estimasiWaktu: waktu2,
        hemat: Math.max(0, Number((emisiKendaraan - emisiKombinasiLRT).toFixed(3))),
        poin: 55,
        isTooFar: isTooFar2,
        firstMileMode: firstMileMode2,
        firstMileKm: firstMile2,
        transitKm: Number((krlTransitKm2 + lrtTransitKm).toFixed(2)),
        lastMileKm: lastMile2,
        stasiunAwal: krlStart.station.name,
        stasiunAkhir: lrtEndKRL.station.name,
        awalLat: krlStart.station.lat,
        awalLon: krlStart.station.lon,
        akhirLat: lrtEndKRL.station.lat,
        akhirLon: lrtEndKRL.station.lon,
      })
    }
  }

  // --- LRT Jabodebek ---
  const lrtStart = findNearestStation(asalLat, asalLon, ['lrt'])
  const lrtEnd = findNearestStation(tujuanLat, tujuanLon, ['lrt'])
  if (lrtStart && lrtEnd) {
    const r = buildTransit('LRT Jabodebek', lrtStart, lrtEnd, EMISI_TRANSPUBLIK.lrt)
    if (r) results.push(r)
  }

  results.push({
    moda: 'Sepeda',
    emisi: 0,
    estimasiWaktu: Math.round(jarakKm * 6),
    hemat: emisiKendaraan,
    poin: POIN_REWARD['Sepeda'],
  })

  // Tambahkan opsi kendaraan pribadi agar user tetap bisa mencatatnya
  const emisiMotor = hitungEmisi('motor', 'ron92', jarakKm)
  results.push({
    moda: 'Motor Pribadi',
    emisi: emisiMotor,
    estimasiWaktu: Math.round(jarakKm * 2.5),
    hemat: Math.max(0, Number((emisiKendaraan - emisiMotor).toFixed(3))),
    poin: POIN_REWARD['Motor Pribadi'],
  })

  // Mobil Pribadi: emisi = emisi referensi mobil ron92
  const emisiMobil = hitungEmisi('mobil', 'ron92', jarakKm)
  results.push({
    moda: 'Mobil Pribadi',
    emisi: emisiMobil,
    estimasiWaktu: Math.round(jarakKm * 3.5),
    hemat: Math.max(0, Number((emisiKendaraan - emisiMobil).toFixed(3))),
    poin: POIN_REWARD['Mobil Pribadi'],
  })

  return results.sort((a, b) => a.emisi - b.emisi)
}
