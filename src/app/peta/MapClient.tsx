'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Google Maps-style teardrop pin using divIcon + inline SVG
function googlePin(color: string, size = 32): L.DivIcon {
  const h = Math.round(size * 1.45)
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 32 46">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 30 16 30S32 28 32 16C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <circle cx="16" cy="16" r="6.5" fill="white" opacity="0.95"/>
    </svg>`,
    className: '',
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
    popupAnchor: [0, -h],
  })
}

// Red destination pin (Google Maps style)
const redPin = googlePin('#EA4335')
// Green origin pin
const greenPin = googlePin('#1D9E75')
// Small blue station pin
const stationPin = googlePin('#4285F4', 22)

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
  visible?: boolean
}

// Component helper to fit bounds when route changes
function FitBounds({ rute }: { rute: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (rute.length > 0 && map && (map as any)._loaded !== undefined) {
      map.fitBounds(rute, { padding: [50, 50] })
    }
  }, [map, rute])
  return null
}

// Komponen untuk mengupdate view peta tanpa remount MapContainer
function MapController({ asal }: { asal: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (asal && map && (map as any)._loaded !== undefined) {
      map.setView(asal, map.getZoom())
    }
  }, [map, asal])
  return null
}

// Force Leaflet to recalculate tile layout when container becomes visible (mobile tab switch)
function InvalidateOnVisible({ visible }: { visible: boolean }) {
  const map = useMap()
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (visible && map) {
      timeoutId = setTimeout(() => {
        // Only invalidate if map instance is still valid
        if (map && (map as any)._loaded !== undefined) {
          map.invalidateSize()
        }
      }, 50)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [map, visible])
  return null
}

export default function MapClient({ asal, tujuan, ruteOSRM, activeTransit, visible = true }: MapClientProps) {
  // Center TIDAK boleh berubah di MapContainer — update dilakukan via MapController
  const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full rounded-2xl shadow-sm z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Update view saat asal berubah tanpa remount MapContainer */}
      <MapController asal={asal} />
      {/* Force redraw on mobile tab switch */}
      <InvalidateOnVisible visible={visible} />
      
      {asal && <Marker position={asal} icon={greenPin} />}
      {tujuan && <Marker position={tujuan} icon={redPin} />}

      {/* Jika ada mode transit aktif */}
      {activeTransit && asal && tujuan && (
        <>
          {/* Stasiun Markers */}
          <Marker position={[activeTransit.awalLat, activeTransit.awalLon]} icon={stationPin} />
          <Marker position={[activeTransit.akhirLat, activeTransit.akhirLon]} icon={stationPin} />

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
          <Polyline positions={ruteOSRM} color="#3b82f6" weight={5} opacity={0.8} />
          <FitBounds rute={ruteOSRM} />
        </>
      )}
      
      {!activeTransit && !ruteOSRM && asal && tujuan && (
        <Polyline positions={[asal, tujuan]} color="#9ca3af" weight={3} dashArray="5, 10" />
      )}
    </MapContainer>
  )
}
