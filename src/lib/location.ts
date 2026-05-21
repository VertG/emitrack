export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\bdki\b/gi, 'DKI')
    .replace(/\bdi\b/gi, 'DI')
}

export async function getUserCity(fallbackCity?: string): Promise<string> {
  const fallback = fallbackCity ? toTitleCase(fallbackCity) : 'Jakarta'

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
                resolve(toTitleCase(foundCity.trim()))
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
    return data.city ? toTitleCase(data.city) : fallback
  } catch (err) {
    return fallback
  }
}
