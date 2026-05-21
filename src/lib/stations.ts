import { hitungJarak } from './emisi'

export type TransitType = 'mrt' | 'krl' | 'tj'

export type Station = {
  id: string
  name: string
  lat: number
  lon: number
  type: TransitType
}

export const STATIONS: Station[] = [
  // MRT
  { id: 'mrt-lebakbulus', name: 'Stasiun MRT Lebak Bulus', lat: -6.2893, lon: 106.7753, type: 'mrt' },
  { id: 'mrt-fatmawati', name: 'Stasiun MRT Fatmawati', lat: -6.2925, lon: 106.7942, type: 'mrt' },
  { id: 'mrt-blokm', name: 'Stasiun MRT Blok M', lat: -6.2442, lon: 106.7979, type: 'mrt' },
  { id: 'mrt-senayan', name: 'Stasiun MRT Senayan', lat: -6.2267, lon: 106.8016, type: 'mrt' },
  { id: 'mrt-dukuh', name: 'Stasiun MRT Dukuh Atas', lat: -6.2010, lon: 106.8225, type: 'mrt' },
  { id: 'mrt-hi', name: 'Stasiun MRT Bundaran HI', lat: -6.1925, lon: 106.8227, type: 'mrt' },

  // KRL
  { id: 'krl-bogor', name: 'Stasiun Bogor', lat: -6.5950, lon: 106.7892, type: 'krl' },
  { id: 'krl-depok', name: 'Stasiun Depok', lat: -6.3934, lon: 106.8183, type: 'krl' },
  { id: 'krl-manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lon: 106.8497, type: 'krl' },
  { id: 'krl-sudirman', name: 'Stasiun Sudirman', lat: -6.2024, lon: 106.8230, type: 'krl' },
  { id: 'krl-tanahabang', name: 'Stasiun Tanah Abang', lat: -6.1856, lon: 106.8105, type: 'krl' },
  { id: 'krl-jakartakota', name: 'Stasiun Jakarta Kota', lat: -6.1376, lon: 106.8146, type: 'krl' },
  { id: 'krl-jatinegara', name: 'Stasiun Jatinegara', lat: -6.2150, lon: 106.8708, type: 'krl' },

  // TransJakarta (TJ)
  { id: 'tj-monas', name: 'Halte Monas', lat: -6.1764, lon: 106.8223, type: 'tj' },
  { id: 'tj-harmoni', name: 'Halte Harmoni', lat: -6.1666, lon: 106.8221, type: 'tj' },
  { id: 'tj-blokm', name: 'Halte Blok M', lat: -6.2444, lon: 106.7990, type: 'tj' },
  { id: 'tj-kuningan', name: 'Halte Kuningan Timur', lat: -6.2392, lon: 106.8310, type: 'tj' },
  { id: 'tj-cawang', name: 'Halte Cawang UKI', lat: -6.2505, lon: 106.8732, type: 'tj' },
  { id: 'tj-kp-rambutan', name: 'Halte Kp. Rambutan', lat: -6.3090, lon: 106.8821, type: 'tj' },
  { id: 'tj-ragunan', name: 'Halte Ragunan', lat: -6.3023, lon: 106.8236, type: 'tj' },
  { id: 'tj-grogol', name: 'Halte Grogol', lat: -6.1662, lon: 106.7891, type: 'tj' },
  { id: 'tj-pluit', name: 'Halte Pluit', lat: -6.1150, lon: 106.7954, type: 'tj' },
]

export function findNearestStation(lat: number, lon: number, types: TransitType[]): { station: Station; distKm: number } | null {
  const filtered = STATIONS.filter(s => types.includes(s.type))
  if (filtered.length === 0) return null

  let nearest = filtered[0]
  let minDist = hitungJarak(lat, lon, nearest.lat, nearest.lon)

  for (const st of filtered) {
    const dist = hitungJarak(lat, lon, st.lat, st.lon)
    if (dist < minDist) {
      minDist = dist
      nearest = st
    }
  }

  return { station: nearest, distKm: Number(minDist.toFixed(2)) }
}
