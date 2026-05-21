export async function getUserCity(fallbackCity?: string): Promise<string> {
  const fallback = fallbackCity || 'Jakarta'

  // Try HTML5 Geolocation first for accurate local city
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const city = await new Promise<string>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
              const data = await res.json()
              const foundCity = data.address?.city || 
                                data.address?.municipality || 
                                data.address?.county || 
                                data.address?.state_district || 
                                data.address?.town
              if (foundCity) {
                // Remove prefixes like "Kota", "Kabupaten" to match database
                resolve(foundCity.replace(/^(Kabupaten|Kota)\s+/i, '').trim())
              } else {
                reject(new Error('City not found in Nominatim'))
              }
            } catch (err) {
              reject(err)
            }
          },
          (err) => reject(err),
          { timeout: 5000 }
        )
      })
      return city
    } catch (err) {
      // If geolocation fails or is denied, fall through to IP detection
      console.warn('Geolocation failed, falling back to IP:', err)
    }
  }

  // Fallback to IP detection
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) return fallback
    const data = await res.json()
    return data.city || fallback
  } catch (err) {
    return fallback
  }
}
