'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon for React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const stationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [1, -28],
  shadowSize: [32, 32]
})

export type MapClientProps = {
  asal: [number, number] | null
  tujuan: [number, number] | null
  ruteOSRM: [number, number][] | null // [lat, lon][]
  activeTransit?: {
    awalLat: number
    awalLon: number
    akhirLat: number
    akhirLon: number
    ruteTransitOSRM?: [number, number][] | null
    ruteFirstMileOSRM?: [number, number][] | null
    ruteLastMileOSRM?: [number, number][] | null
  } | null
}

// Component helper to fit bounds when route changes
function FitBounds({ rute }: { rute: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (rute.length > 0) {
      map.fitBounds(rute, { padding: [50, 50] })
    }
  }, [map, rute])
  return null
}

export default function MapClient({ asal, tujuan, ruteOSRM, activeTransit }: MapClientProps) {
  const center: [number, number] = asal || [-6.2088, 106.8456] // Default Jakarta

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full rounded-2xl shadow-sm z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {asal && <Marker position={asal} icon={greenIcon} />}
      {tujuan && <Marker position={tujuan} icon={redIcon} />}

      {/* Jika ada mode transit aktif */}
      {activeTransit && asal && tujuan && (
        <>
          {/* Stasiun Markers */}
          <Marker position={[activeTransit.awalLat, activeTransit.awalLon]} icon={stationIcon} />
          <Marker position={[activeTransit.akhirLat, activeTransit.akhirLon]} icon={stationIcon} />

          {/* First Mile */}
          <Polyline 
            positions={activeTransit.ruteFirstMileOSRM && activeTransit.ruteFirstMileOSRM.length > 0 
              ? activeTransit.ruteFirstMileOSRM 
              : [asal, [activeTransit.awalLat, activeTransit.awalLon]]} 
            color="#9ca3af" weight={3} dashArray="5, 10" 
          />
          
          {/* Transit Line */}
          <Polyline 
            positions={activeTransit.ruteTransitOSRM && activeTransit.ruteTransitOSRM.length > 0 
              ? activeTransit.ruteTransitOSRM 
              : [[activeTransit.awalLat, activeTransit.awalLon], [activeTransit.akhirLat, activeTransit.akhirLon]]} 
            color="#3b82f6" weight={5} opacity={0.8} 
          />
          
          {/* Last Mile */}
          <Polyline 
            positions={activeTransit.ruteLastMileOSRM && activeTransit.ruteLastMileOSRM.length > 0
              ? activeTransit.ruteLastMileOSRM
              : [[activeTransit.akhirLat, activeTransit.akhirLon], tujuan]} 
            color="#9ca3af" weight={3} dashArray="5, 10" 
          />

          <FitBounds rute={activeTransit.ruteTransitOSRM || [asal, tujuan]} />
        </>
      )}
      
      {/* Jika tidak ada mode transit (mode mobil standar) */}
      {!activeTransit && ruteOSRM && ruteOSRM.length > 0 && (
        <>
          <Polyline positions={ruteOSRM} color="#1D9E75" weight={5} opacity={0.8} />
          <FitBounds rute={ruteOSRM} />
        </>
      )}
      
      {!activeTransit && !ruteOSRM && asal && tujuan && (
        <Polyline positions={[asal, tujuan]} color="#9ca3af" weight={3} dashArray="5, 10" />
      )}
    </MapContainer>
  )
}
