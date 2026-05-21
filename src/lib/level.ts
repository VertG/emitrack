import { Sprout, Leaf, TreePine, Zap, Gem } from 'lucide-react'
import { ElementType } from 'react'

export type LevelData = {
  level: number
  nama: string
  icon: ElementType
  minPoin: number
  maxPoin: number
  warna: string
  warnaLight: string
  deskripsi: string
}

export const LEVELS: LevelData[] = [
  {
    level: 1,
    nama: 'Pemula',
    icon: Sprout,
    minPoin: 0,
    maxPoin: 99,
    warna: '#6B7280',
    warnaLight: '#F3F4F6',
    deskripsi: 'Baru memulai perjalanan hijau',
  },
  {
    level: 2,
    nama: 'Pejuang Hijau',
    icon: Leaf,
    minPoin: 100,
    maxPoin: 299,
    warna: '#1D9E75',
    warnaLight: '#E1F5EE',
    deskripsi: 'Mulai konsisten lacak emisi',
  },
  {
    level: 3,
    nama: 'Eco Hero',
    icon: TreePine,
    minPoin: 300,
    maxPoin: 699,
    warna: '#085041',
    warnaLight: '#D1FAE5',
    deskripsi: 'Komitmen nyata kurangi emisi',
  },
  {
    level: 4,
    nama: 'Carbon Fighter',
    icon: Zap,
    minPoin: 700,
    maxPoin: 1499,
    warna: '#2563EB',
    warnaLight: '#DBEAFE',
    deskripsi: 'Pejuang karbon sejati',
  },
  {
    level: 5,
    nama: 'Green Legend',
    icon: Gem,
    minPoin: 1500,
    maxPoin: Infinity,
    warna: '#7C3AED',
    warnaLight: '#EDE9FE',
    deskripsi: 'Legenda keberlanjutan kota',
  },
]

// Fungsi ambil level berdasarkan poin
export function getLevelByPoin(poin: number) {
  return LEVELS.findLast(l => poin >= l.minPoin) ?? LEVELS[0]
}

// Fungsi hitung progress ke level berikutnya (0-100)
export function getLevelProgress(poin: number): {
  current: LevelData
  next: LevelData | null
  progress: number
  poinToNext: number
} {
  const current = getLevelByPoin(poin)
  const nextIndex = LEVELS.findIndex(l => l.level === current.level) + 1
  const next = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null

  if (!next) return { current, next: null, progress: 100, poinToNext: 0 }

  const range = next.minPoin - current.minPoin
  const gained = poin - current.minPoin
  const progress = Math.min(Math.round((gained / range) * 100), 100)
  const poinToNext = next.minPoin - poin

  return { current, next, progress, poinToNext }
}

// Badge eksklusif yang unlock berdasarkan level
export const LEVEL_BADGES = [
  {
    levelRequired: 2,
    icon: Leaf,
    nama: 'Pejuang Hijau',
    deskripsi: 'Capai level Pejuang Hijau (100 poin)',
  },
  {
    levelRequired: 3,
    icon: TreePine,
    nama: 'Eco Hero',
    deskripsi: 'Capai level Eco Hero (300 poin)',
  },
  {
    levelRequired: 4,
    icon: Zap,
    nama: 'Carbon Fighter',
    deskripsi: 'Capai level Carbon Fighter (700 poin)',
  },
  {
    levelRequired: 5,
    icon: Gem,
    nama: 'Green Legend',
    deskripsi: 'Capai level Green Legend (1500 poin)',
  },
]
