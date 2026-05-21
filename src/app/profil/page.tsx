'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { SkeletonCard, SkeletonText } from '@/components/Skeleton'

type Profile = {
  id: string
  email: string
  username: string | null
  full_name: string | null
  kota: string | null
  total_poin: number
  total_hemat: number
  streak: number
  created_at: string
}

type TripStats = {
  totalTrip: number
  totalJarak: number
  totalEmisi: number
  totalHemat: number
  tripUmumCount: number
}

const BADGE_DEFINITIONS = [
  {
    id: 'pemula',
    icon: '🌱',
    nama: 'Pemula Hijau',
    deskripsi: 'Catat perjalanan pertamamu',
    check: (p: Profile, s: TripStats) => s.totalTrip >= 1,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(s.totalTrip, 1), max: 1, label: 'trip' }),
  },
  {
    id: 'konsisten',
    icon: '🔥',
    nama: 'Konsisten',
    deskripsi: 'Streak 3 hari berturut-turut',
    check: (p: Profile, s: TripStats) => p.streak >= 3,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(p.streak, 3), max: 3, label: 'hari' }),
  },
  {
    id: 'green_commuter',
    icon: '🚌',
    nama: 'Green Commuter',
    deskripsi: 'Gunakan transportasi umum 7x',
    check: (p: Profile, s: TripStats) => s.tripUmumCount >= 7,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(s.tripUmumCount, 7), max: 7, label: 'trip' }),
  },
  {
    id: 'penyelamat',
    icon: '💨',
    nama: 'Penyelamat Udara',
    deskripsi: 'Hemat 10 kg CO₂ total',
    check: (p: Profile, s: TripStats) => p.total_hemat >= 10,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(p.total_hemat, 10), max: 10, label: 'kg' }),
  },
  {
    id: 'eco_warrior',
    icon: '🌳',
    nama: 'Eco Warrior',
    deskripsi: 'Hemat 50 kg CO₂ total',
    check: (p: Profile, s: TripStats) => p.total_hemat >= 50,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(p.total_hemat, 50), max: 50, label: 'kg' }),
  },
  {
    id: 'legenda',
    icon: '🏆',
    nama: 'Legenda Hijau',
    deskripsi: 'Kumpulkan 500 poin',
    check: (p: Profile, s: TripStats) => p.total_poin >= 500,
    progress: (p: Profile, s: TripStats) => ({ val: Math.min(p.total_poin, 500), max: 500, label: 'poin' }),
  },
]

const KOTA_OPTIONS = [
  'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Bekasi',
  'Tangerang', 'Depok', 'Semarang', 'Makassar', 'Bogor',
  'Palembang', 'Cikarang',
]

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ProfilPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<TripStats | null>(null)
  const [rankingInfo, setRankingInfo] = useState<{ rank: number; total: number } | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editKota, setEditKota] = useState('')
  const [saving, setSaving] = useState(false)

  // Logout confirm
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  async function fetchAll() {
    setDataLoading(true)

    const [{ data: prof }, { data: tripsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),
      supabase.from('trips').select('jenis, jarak_km, emisi_kg, emisi_dihemat').eq('user_id', user!.id),
    ])

    if (prof) {
      setProfile(prof)
      setEditUsername(prof.username ?? '')
      setEditKota(prof.kota ?? '')

      // Fetch ranking by kota
      if (prof.kota) {
        const { data: kotaProfiles } = await supabase
          .from('profiles')
          .select('id, total_hemat')
          .eq('kota', prof.kota)
          .order('total_hemat', { ascending: false })

        if (kotaProfiles) {
          const rank = kotaProfiles.findIndex(p => p.id === user!.id) + 1
          setRankingInfo({ rank: rank > 0 ? rank : kotaProfiles.length + 1, total: kotaProfiles.length })
        }
      }
    }

    if (tripsData) {
      const s: TripStats = {
        totalTrip: tripsData.length,
        totalJarak: tripsData.reduce((a, t) => a + t.jarak_km, 0),
        totalEmisi: tripsData.reduce((a, t) => a + t.emisi_kg, 0),
        totalHemat: tripsData.reduce((a, t) => a + t.emisi_dihemat, 0),
        tripUmumCount: tripsData.filter(t => t.jenis === 'transportasi_umum').length,
      }
      setStats(s)
    }

    setDataLoading(false)
  }

  async function handleSaveProfil() {
    if (!user || !profile) return
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: editUsername.trim() || null, kota: editKota || null })
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) setProfile(data)
    setSaving(false)
    setEditing(false)
  }

  const googleName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const googleAvatar = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
  const displayName = profile?.full_name || googleName || profile?.username || user?.email?.split('@')[0] || 'User'
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">Profil Saya</div>
            <div className="text-xs text-gray-400">Statistik & pencapaian personalmu</div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 max-w-3xl w-full mx-auto space-y-5">

          {/* ── HEADER PROFIL ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {dataLoading ? (
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-2">
                  <SkeletonText width="w-1/2" />
                  <SkeletonText width="w-1/3" />
                  <SkeletonText width="w-1/4" />
                </div>
              </div>
            ) : editing ? (
              /* Edit Form */
              <div className="space-y-4">
                <div className="font-medium text-gray-700 text-sm">Edit Profil</div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="Masukkan username..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1D9E75]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Kota</label>
                  <select
                    value={editKota}
                    onChange={e => setEditKota(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1D9E75] bg-white"
                  >
                    <option value="">Pilih kota...</option>
                    {KOTA_OPTIONS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfil}
                    disabled={saving}
                    className="px-4 py-2 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-gray-500 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="shrink-0">
                  {googleAvatar ? (
                    <img
                      src={googleAvatar}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover shadow-md ring-2 ring-[#1D9E75] ring-offset-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1D9E75] flex items-center justify-center text-3xl font-bold text-white shadow-md">
                      {avatarLetter}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-gray-800">{displayName}</div>
                  {profile?.username && (
                    <div className="text-sm text-gray-400">@{profile.username}</div>
                  )}
                  {profile?.kota && (
                    <div className="text-sm text-gray-500 mt-1">📍 {profile.kota}</div>
                  )}
                  {!profile?.username && !profile?.kota && (
                    <div className="text-xs text-gray-400 mt-1">Belum lengkap — tambahkan username & kota</div>
                  )}
                </div>
                {/* Edit button */}
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  ✏️ Edit Profil
                </button>
              </div>
            )}
          </div>

          {/* ── STATISTIK ── */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Statistik Perjalanan</div>
            {dataLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Trip', val: stats?.totalTrip ?? 0, unit: 'perjalanan', color: 'text-gray-700' },
                  { label: 'Total Jarak', val: `${(stats?.totalJarak ?? 0).toFixed(1)}`, unit: 'km', color: 'text-blue-500' },
                  { label: 'CO₂ Dihasilkan', val: `${(stats?.totalEmisi ?? 0).toFixed(2)}`, unit: 'kg CO₂', color: 'text-red-500' },
                  { label: 'CO₂ Dihemat', val: `${(stats?.totalHemat ?? 0).toFixed(2)}`, unit: 'kg CO₂', color: 'text-[#1D9E75]' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.unit}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── GAMIFIKASI ── */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Gamifikasi</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xl font-bold text-[#FAC775]">{profile?.total_poin ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Poin Total</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-orange-500">{profile?.streak ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Streak Hari</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                <div className="text-2xl mb-1">🏙️</div>
                {rankingInfo ? (
                  <>
                    <div className="text-xl font-bold text-[#1D9E75]">#{rankingInfo.rank}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      dari {rankingInfo.total} di<br />{profile?.kota ?? 'kotamu'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-gray-300">—</div>
                    <div className="text-xs text-gray-400 mt-0.5">Set kota dulu</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── BADGE ── */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Badge & Pencapaian</div>
            <div className="grid grid-cols-3 gap-3">
              {BADGE_DEFINITIONS.map(badge => {
                const unlocked = profile && stats ? badge.check(profile, stats) : false
                const prog = profile && stats ? badge.progress(profile, stats) : null
                const pct = prog ? Math.min(100, Math.round((prog.val / prog.max) * 100)) : 0

                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-xl border p-3 shadow-sm transition-all ${
                      unlocked
                        ? 'bg-[#E1F5EE] border-[#9FE1CB]'
                        : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    {/* Corner marker */}
                    <div className="absolute top-2 right-2 text-xs">
                      {unlocked ? (
                        <span className="text-[#1D9E75] font-bold">✓</span>
                      ) : (
                        <span>🔒</span>
                      )}
                    </div>

                    <div className={`text-2xl mb-1.5 ${!unlocked ? 'grayscale' : ''}`}>
                      {badge.icon}
                    </div>
                    <div className="text-xs font-bold text-gray-700 leading-tight">{badge.nama}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{badge.deskripsi}</div>

                    {/* Progress bar (only if locked) */}
                    {!unlocked && prog && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1D9E75] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1">
                          {typeof prog.val === 'number' ? prog.val.toFixed(prog.label === 'kg' ? 1 : 0) : prog.val}/{prog.max} {prog.label}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── INFO AKUN ── */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">Info Akun</div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              {[
                { label: 'Email', val: user?.email ?? '—', icon: '✉️' },
                { label: 'Bergabung sejak', val: profile ? formatTanggal(profile.created_at) : '—', icon: '📅' },
                { label: 'Provider', val: 'Google', icon: '🔐' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                  <div className="text-sm font-medium text-gray-700 text-right max-w-[60%] truncate">
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOMBOL KELUAR ── */}
          <div className="pt-2 pb-4">
            {confirmLogout ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-red-600 font-medium">Yakin ingin keluar?</span>
                <div className="flex gap-2">
                  <button
                    onClick={signOut}
                    className="text-xs bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Ya, Keluar
                  </button>
                  <button
                    onClick={() => setConfirmLogout(false)}
                    className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLogout(true)}
                className="w-full py-3 rounded-xl text-sm font-medium border-2 border-red-300 text-red-500 hover:bg-red-50 transition-colors"
              >
                Keluar dari Akun
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
