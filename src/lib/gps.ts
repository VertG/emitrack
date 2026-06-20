/**
 * GPS Utility Functions — Validasi perjalanan navigasi real-time
 */

// Haversine: hitung jarak antara dua koordinat (km)
export function haversineKm(
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Hitung total jarak kumulatif dari array koordinat GPS [lat, lon][]
export function hitungJarakKumulatif(path: [number, number][]): number {
  if (path.length < 2) return 0
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
    // Filter GPS noise: abaikan lompatan > 1km dalam 1 interval (kemungkinan GPS error)
    if (d < 1) {
      total += d
    }
  }
  return Number(total.toFixed(2))
}

// Cek apakah posisi akhir dekat dengan tujuan (dalam meter)
export function isDekatTujuan(
  posisi: [number, number],
  tujuan: [number, number],
  radiusMeter: number = 500
): boolean {
  const jarakKm = haversineKm(posisi[0], posisi[1], tujuan[0], tujuan[1])
  return jarakKm * 1000 <= radiusMeter
}

// Validasi keseluruhan perjalanan
export type HasilValidasi = {
  valid: boolean
  jarakAktual: number    // km, dari GPS kumulatif
  jarakRute: number      // km, dari OSRM/rute
  persenTercapai: number // 0-100
  dekatTujuan: boolean
  pesan: string
}

export function validasiPerjalanan(
  gpsPath: [number, number][],
  jarakRuteKm: number,
  tujuan: [number, number]
): HasilValidasi {
  const jarakAktual = hitungJarakKumulatif(gpsPath)
  const posisiAkhir = gpsPath[gpsPath.length - 1]
  const dekatTujuan = posisiAkhir ? isDekatTujuan(posisiAkhir, tujuan) : false
  const persenTercapai = jarakRuteKm > 0 ? Math.min(100, Math.round((jarakAktual / jarakRuteKm) * 100)) : 0

  // Validasi: jarak aktual >= 50% rute ATAU posisi akhir dekat tujuan
  const valid = persenTercapai >= 50 || dekatTujuan

  let pesan = ''
  if (valid) {
    pesan = `Perjalanan valid! Kamu menempuh ${jarakAktual.toFixed(1)} km (${persenTercapai}% dari rute).`
  } else {
    pesan = `Perjalanan belum mencukupi. Baru ${jarakAktual.toFixed(1)} km dari ${jarakRuteKm} km (${persenTercapai}%). Lanjutkan perjalananmu!`
  }

  return { valid, jarakAktual, jarakRute: jarakRuteKm, persenTercapai, dekatTujuan, pesan }
}

// Format durasi detik → "X mnt Y dtk"
export function formatDurasi(detik: number): string {
  if (detik < 60) return `${detik} dtk`
  const menit = Math.floor(detik / 60)
  const sisa = detik % 60
  if (menit >= 60) {
    const jam = Math.floor(menit / 60)
    const sisaMnt = menit % 60
    return `${jam} jam ${sisaMnt} mnt`
  }
  return sisa > 0 ? `${menit} mnt ${sisa} dtk` : `${menit} mnt`
}
