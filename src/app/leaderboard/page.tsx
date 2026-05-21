'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { getUserCity } from '@/lib/location'

type Profile = {
  id: string
  username: string
  kota: string
  total_hemat: number | null
  total_poin: number | null
}

type Stats = {
  totalUser: number
  totalHematKomunitas: number
  totalTripHijau: number
}

type Tab = 'semua' | 'kota' | 'sekitar'

// ── Skeleton helpers ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50 animate-pulse">
      <div className="w-6 h-4 bg-gray-200 rounded" />
      <div className="w-7 h-7 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="h-2.5 w-16 bg-gray-100 rounded" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-3 w-14 bg-gray-200 rounded" />
        <div className="h-2.5 w-10 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

function SkeletonPodium() {
  return (
    <div className="flex items-end justify-center gap-6 py-4 animate-pulse">
      {[72, 96, 56].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="h-2.5 w-14 bg-gray-200 rounded" />
          <div className="h-2 w-10 bg-gray-100 rounded" />
          <div className={`w-16 bg-gray-200 rounded-t-lg`} style={{ height: h }} />
        </div>
      ))}
    </div>
  )
}

// ── Medal colours ─────────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_BG = ['bg-[#FAC775]', 'bg-gray-300', 'bg-amber-600']
const PODIUM_TEXT = ['text-[#085041]', 'text-white', 'text-white']
const PODIUM_GLOW = [
  'shadow-[0_4px_20px_rgba(250,199,117,0.5)]',
  '',
  'shadow-[0_4px_16px_rgba(217,119,6,0.35)]',
]

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('semua')
  const [allRanking, setAllRanking] = useState<Profile[]>([])
  const [kotaRanking, setKotaRanking] = useState<Profile[]>([])
  const [sekitarRanking, setSekitarRanking] = useState<Profile[]>([])
  const [currentCity, setCurrentCity] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [userGlobalRank, setUserGlobalRank] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [challengeCount, setChallengeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (authLoading || !user) return
    fetchAll()
  }, [user, authLoading])

  // Sort helper — treat null total_hemat as 0
  function sortByHemat(arr: Profile[]): Profile[] {
    return [...arr].sort((a, b) => (b.total_hemat ?? 0) - (a.total_hemat ?? 0))
  }

  async function fetchAll() {
    setLoading(true)
    const detectedCity = await getUserCity()
    setCurrentCity(detectedCity)

    // Fetch profiles + all trips in parallel
    const [
      { data: profilesRaw, error: profilesErr },
      { data: tripsRaw, error: tripsErr },
    ] = await Promise.all([
      supabase.from('profiles').select('*').limit(200),
      supabase.from('trips').select('user_id, emisi_dihemat, poin_didapat, jenis, created_at'),
    ])

    if (profilesErr) {
      console.error('[leaderboard] profiles error →', profilesErr.message, '| code:', profilesErr.code)
    }
    if (tripsErr) {
      console.error('[leaderboard] trips error →', tripsErr.message, '| code:', tripsErr.code)
    }

    // Aggregate hemat + poin per user from trips (source of truth)
    const statsByUser: Record<string, { hemat: number; poin: number }> = {}
    for (const t of tripsRaw ?? []) {
      if (!statsByUser[t.user_id]) statsByUser[t.user_id] = { hemat: 0, poin: 0 }
      statsByUser[t.user_id].hemat += t.emisi_dihemat ?? 0
      statsByUser[t.user_id].poin  += t.poin_didapat  ?? 0
    }

    // Enrich profiles with trip-computed stats
    const enriched: Profile[] = (profilesRaw ?? []).map(p => ({
      ...p,
      total_hemat: Number((statsByUser[p.id]?.hemat ?? 0).toFixed(2)),
      total_poin:  statsByUser[p.id]?.poin ?? 0,
    }))

    // 1. Global ranking — sort by computed hemat
    const global = sortByHemat(enriched).slice(0, 20)
    setAllRanking(global)

    // 2. Own profile
    const me = enriched.find(p => p.id === user!.id) ?? null
    if (me) setUserProfile(me)

    // Global rank
    const meInTop = global.findIndex(p => p.id === user!.id)
    if (meInTop >= 0) {
      setUserGlobalRank(meInTop + 1)
    } else if (me) {
      const above = enriched.filter(p => (p.total_hemat ?? 0) > (me.total_hemat ?? 0)).length
      setUserGlobalRank(above + 1)
    }

    // 3. Kota filter ranking
    const userKota = me?.kota ?? ''
    if (userKota) {
      const kotaProfiles = enriched.filter(p => p.kota === userKota)
      setKotaRanking(sortByHemat(kotaProfiles).slice(0, 20))
    }

    // 4. Sekitar filter ranking
    if (detectedCity) {
      const sekitarProfiles = enriched.filter(p => p.kota === detectedCity)
      setSekitarRanking(sortByHemat(sekitarProfiles).slice(0, 20))
    }

    // 4. Community stats — computed from trips
    const totalHematKomunitas = enriched.reduce((s, p) => s + (p.total_hemat ?? 0), 0)
    const totalTripHijau = (tripsRaw ?? []).filter(t => t.jenis === 'transportasi_umum').length
    setStats({
      totalUser: enriched.length,
      totalHematKomunitas: Number(totalHematKomunitas.toFixed(1)),
      totalTripHijau,
    })

    // 5. Challenge progress — transportasi_umum trips in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const chalCount = (tripsRaw ?? []).filter(
      t =>
        t.user_id === user!.id &&
        t.jenis === 'transportasi_umum' &&
        new Date(t.created_at) >= sevenDaysAgo
    ).length
    setChallengeCount(Math.min(chalCount, 5))

    setLoading(false)
  }

  const ranking = tab === 'semua' ? allRanking : tab === 'kota' ? kotaRanking : sekitarRanking
  const podium = ranking.slice(0, 3)
  // Podium display order: 2nd (left), 1st (centre, taller), 3rd (right)
  const podiumOrder = [podium[1], podium[0], podium[2]]
  const podiumOriginalIdx = [1, 0, 2] // index into allRanking
  const podiumHeights = [72, 100, 56]

  const meInCurrentRanking = ranking.findIndex(p => p.id === user?.id)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* ── Topbar ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <div>
            <div className="font-medium text-gray-800">Leaderboard</div>
            <div className="text-xs text-gray-400">Siapa yang paling hijau?</div>
          </div>
          {/* Tab pills */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {(['semua', 'kota', 'sekitar'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  tab === t
                    ? 'bg-white text-[#1D9E75] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'semua' ? 'Semua' : t === 'kota' ? `Kota Saya${userProfile?.kota ? ` (${userProfile.kota})` : ''}` : `Sekitar (${currentCity ?? '...'})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-5">
              {/* ══════════ LEFT COLUMN ══════════ */}
              <div className="flex flex-col gap-4">
                {/* Podium */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                    Top 3
                  </div>
                  {loading ? (
                    <SkeletonPodium />
                  ) : podium.length === 0 ? (
                    <div className="text-center text-gray-300 text-sm py-8">
                      Belum ada data
                    </div>
                  ) : (
                    <div className="flex items-end justify-center gap-5 pt-2">
                      {podiumOrder.map((p, col) => {
                        if (!p) return <div key={col} className="w-16" />
                        const origIdx = podiumOriginalIdx[col]
                        const h = podiumHeights[col]
                        return (
                          <div key={p.id} className="flex flex-col items-center gap-1">
                            {/* Avatar */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${PODIUM_BG[origIdx]} ${PODIUM_TEXT[origIdx]} ${PODIUM_GLOW[origIdx]}`}
                            >
                              {(p.username || 'U')[0].toUpperCase()}
                            </div>
                            {/* Medal */}
                            <div className="text-lg leading-none">{MEDALS[origIdx]}</div>
                            {/* Name */}
                            <div className="text-xs font-semibold text-gray-700 max-w-[64px] text-center truncate">
                              {p.username || 'User'}
                            </div>
                            {/* CO2 */}
                            <div className="text-[10px] text-gray-400 text-center">
                              {(p.total_hemat ?? 0).toFixed(1)} kg
                            </div>
                            {/* Pillar */}
                            <div
                              className={`w-16 rounded-t-xl flex items-center justify-center font-bold text-sm ${PODIUM_BG[origIdx]} ${PODIUM_TEXT[origIdx]}`}
                              style={{ height: h }}
                            >
                              #{origIdx + 1}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* User rank card (outside top-20) */}
                {!loading && tab === 'semua' && userGlobalRank && userGlobalRank > 20 && userProfile && (
                  <div className="bg-[#E1F5EE] rounded-xl border border-[#9FE1CB] p-4">
                    <div className="text-xs text-[#085041] font-semibold mb-1">Posisi kamu saat ini</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-9 h-9 rounded-full bg-[#1D9E75] flex items-center justify-center text-white font-bold text-sm">
                        {(userProfile.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#085041]">
                          {userProfile.username} <span className="font-normal text-[#1D9E75]">(Kamu)</span>
                        </div>
                        <div className="text-xs text-[#0F6E56]">{userProfile.kota}</div>
                      </div>
                      <div className="text-2xl font-bold text-[#1D9E75]">
                        #{userGlobalRank}
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-[#0F6E56]">
                      Hemat {(userProfile.total_hemat ?? 0).toFixed(1)} kg CO₂ · {(userProfile.total_poin ?? 0).toLocaleString()} poin
                    </div>
                  </div>
                )}

                {/* Challenge card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🎯</span>
                    <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                      Tantangan Minggu Ini
                    </div>
                  </div>
                  <div className="text-base font-bold text-amber-800 mb-1">Pekan Tanpa Mobil</div>
                  <div className="text-xs text-amber-600 mb-4">
                    Input 5 trip transportasi umum minggu ini
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1 flex justify-between text-xs text-amber-600 font-medium">
                    <span>Progress</span>
                    <span>{loading ? '—' : `${challengeCount}/5`}</span>
                  </div>
                  <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                      style={{ width: loading ? '0%' : `${(challengeCount / 5) * 100}%` }}
                    />
                  </div>
                  {!loading && challengeCount >= 5 && (
                    <div className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                      ✓ Tantangan selesai!
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-amber-500">Hadiah</div>
                    <div className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                      +500 poin 🏅
                    </div>
                  </div>
                </div>

                {/* Community stats */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                    Statistik Komunitas
                  </div>
                  {loading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between">
                          <div className="h-3 w-28 bg-gray-100 rounded" />
                          <div className="h-3 w-14 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        {
                          label: 'Total pengguna',
                          value: `${stats?.totalUser ?? 0} orang`,
                          icon: '👥',
                          color: 'text-[#1D9E75]',
                        },
                        {
                          label: 'CO₂ dihemat komunitas',
                          value: `${stats?.totalHematKomunitas ?? 0} kg`,
                          icon: '🌍',
                          color: 'text-[#1D9E75]',
                        },
                        {
                          label: 'Total trip hijau',
                          value: `${(stats?.totalTripHijau ?? 0).toLocaleString()} trip`,
                          icon: '🚌',
                          color: 'text-[#1D9E75]',
                        },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{s.icon}</span>
                            {s.label}
                          </div>
                          <div className={`text-sm font-semibold ${s.color}`}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════ RIGHT COLUMN — Ranking list ══════════ */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                  {tab === 'semua' ? 'Semua Peserta' : tab === 'kota' ? `Peserta di ${userProfile?.kota ?? 'Kota Kamu'}` : `Peserta di Sekitarmu (${currentCity ?? '...'})`}
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                    <div className="text-4xl mb-3">🌱</div>
                    <div className="text-sm text-center">
                      {tab === 'kota'
                        ? 'Belum ada peserta dari kota kamu.'
                        : tab === 'sekitar'
                        ? 'Belum ada peserta di sekitarmu.'
                        : 'Belum ada data. Jadilah yang pertama!'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {ranking.map((r, i) => {
                      const isMe = r.id === user?.id
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                            isMe
                              ? 'bg-[#E1F5EE] border border-[#9FE1CB]'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          {/* Rank number or medal */}
                          <div className="w-7 text-center flex-shrink-0">
                            {i < 3 ? (
                              <span className="text-base leading-none">{MEDALS[i]}</span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-400">
                                {i + 1}
                              </span>
                            )}
                          </div>

                          {/* Avatar */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isMe
                                ? 'bg-[#1D9E75] text-white'
                                : i === 0
                                ? 'bg-[#FAC775] text-[#085041]'
                                : i === 1
                                ? 'bg-gray-300 text-white'
                                : i === 2
                                ? 'bg-amber-600 text-white'
                                : 'bg-[#E1F5EE] text-[#1D9E75]'
                            }`}
                          >
                            {(r.username || 'U')[0].toUpperCase()}
                          </div>

                          {/* Name + city */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium truncate ${
                                isMe ? 'text-[#085041]' : 'text-gray-700'
                              }`}
                            >
                              {r.username || 'User'}
                              {isMe && (
                                <span className="ml-1.5 text-[#1D9E75] font-semibold text-xs">
                                  (Kamu)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{r.kota}</div>
                          </div>

                          {/* Score */}
                          <div className="text-right flex-shrink-0">
                            <div
                              className={`text-sm font-semibold ${
                                isMe ? 'text-[#1D9E75]' : 'text-gray-700'
                              }`}
                            >
                              {(r.total_hemat ?? 0).toFixed(1)} kg
                            </div>
                            <div className="text-[10px] text-gray-400">CO₂ hemat</div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Sticky "your position" row if not in current ranking list */}
                    {meInCurrentRanking === -1 && userProfile && (
                      <>
                        <div className="flex items-center gap-2 py-1 px-3 text-xs text-gray-300">
                          <div className="flex-1 border-t border-dashed border-gray-200" />
                          <span>···</span>
                          <div className="flex-1 border-t border-dashed border-gray-200" />
                        </div>
                        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[#E1F5EE] border border-[#9FE1CB]">
                          <div className="w-7 text-center flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-400">
                              {tab === 'semua' ? (userGlobalRank ?? '?') : '?'}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(userProfile.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#085041] truncate">
                              {userProfile.username || 'User'}
                              <span className="ml-1.5 text-[#1D9E75] font-semibold text-xs">
                                (Kamu)
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">{userProfile.kota}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-[#1D9E75]">
                              {(userProfile.total_hemat ?? 0).toFixed(1)} kg
                            </div>
                            <div className="text-[10px] text-gray-400">CO₂ hemat</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
