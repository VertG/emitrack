export async function getUserCity(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) return 'Jakarta'
    const data = await res.json()
    return data.city || 'Jakarta'
  } catch (err) {
    return 'Jakarta'
  }
}
