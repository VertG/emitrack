'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

export type NominatimResult = {
  lat: string
  lon: string
  display_name: string
}

export type LocationInputProps = {
  label: string
  placeholder: string
  value: NominatimResult | null
  onChange: (val: NominatimResult | null) => void
}

export default function LocationInput({ label, placeholder, value, onChange }: LocationInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (value) {
      setQuery(shortenName(value.display_name))
      setShowDropdown(false)
    } else {
      setQuery('')
    }
  }, [value])

  const shortenName = (name: string) => {
    return name.split(',').slice(0, 3).join(',')
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    if (text.length < 3) {
      setResults([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=id`
        )
        const data = await res.json()
        setResults(data)
        setShowDropdown(true)
      } catch (err) {
        console.error('Nominatim error', err)
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  const handleSelectMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser Anda.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toString()
        const lon = pos.coords.longitude.toString()
        
        // Reverse geocode untuk dapat nama
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          const data = await res.json()
          const loc: NominatimResult = {
            lat,
            lon,
            display_name: data.display_name || 'Lokasi Saya'
          }
          onChange(loc)
        } catch {
          onChange({ lat, lon, display_name: 'Lokasi Saya' })
        }
        setLoading(false)
      },
      () => {
        alert('Gagal mengambil lokasi. Pastikan izin lokasi diberikan.')
        setLoading(false)
      }
    )
  }

  return (
    <div className="relative w-full">
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => {
            handleSearch(e.target.value)
            if (value) onChange(null) // clear selection if typing
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#1D9E75] transition-colors"
        />
        <button
          onClick={handleSelectMyLocation}
          disabled={loading}
          className="px-3 py-2 bg-[#E1F5EE] text-[#1D9E75] text-sm font-medium rounded-lg hover:bg-[#c5eadb] transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
        >
          <MapPin size={16} className="shrink-0" /> Lokasi Saya
        </button>
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {loading && <div className="px-4 py-3 text-xs text-gray-400 text-center animate-pulse">Mencari...</div>}
          {!loading && results.length === 0 && query.length >= 3 && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">Lokasi tidak ditemukan</div>
          )}
          {!loading && results.map((r, i) => (
            <div
              key={i}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate"
              onClick={() => onChange(r)}
            >
              {shortenName(r.display_name)}
            </div>
          ))}
        </div>
      )}
      
      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
