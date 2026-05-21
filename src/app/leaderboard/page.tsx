'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type RankEntry = {
  id: string
  username: string
  kota: string
  total_hemat: number
  total_poin: number
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, kota, total_hemat, total_poin')
      .order('total_hemat', { ascending: false })
      .limit(20)

    if (data) {
      setRanking(data)
      if (user) {
        const rank = data.findIndex(d => d.id === user.id) + 1
        setUserRank(rank > 0 ? rank : null)
      }
    }
    setLoading(false)
  }

  const podium = ranking.slice(0, 3)
  const sisanya = ranking.slice(3)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="font-medium text-gray-800">Leaderboard</div>
          <div className="text-xs text-gray-400">Siapa yang paling hijau minggu ini?</div>
        </div>

        <div className="flex-1 p-6">
          {loading ? (
            <div className="text-center text-gray-300 py-12">Memuat data...</div>
          ) : ranking.length === 0 ? (
            <div className="text-center text-gray-300 py-12">
              <div className="text-4xl mb-3">🌱</div>
              <div>Belum ada data. Jadilah yang pertama input perjalanan!</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                {/* Podium */}
                {podium.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-4">Top 3</div>
                    <div className="flex items-end justify-center gap-4 py-2">
                      {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, i) => {
                        const positions = [1, 0, 2]
                        const heights = ['h-16', 'h-24', 'h-12']
                        const colors = ['bg-gray-300', 'bg-amber-400', 'bg-orange-300']
                        const idx = positions[i]
                        return (
                          <div key={p.id} className="flex flex-col items-center gap-1">
                            <div className="text-xl">{medals[idx]}</div>
                            <div className="text-xs font-medium text-gray-700 max-w-[60px] text-center truncate">
                              {p.username || 'User'}
                            </div>
                            <div className="text-xs text-gray-400">{p.total_hemat.toFixed(1)} kg</div>
                            <div className={`w-16 ${heights[i]} ${colors[i]} rounded-t-lg flex items-center justify-center text-white font-medium`}>
                              {idx + 1}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Posisi user */}
                {userRank && userRank > 3 && (
                  <div className="bg-[#E1F5EE] rounded-xl border border-[#9FE1CB] p-3 mb-4">
                    <div className="text-xs text-[#085041] font-medium">Posisi kamu</div>
                    <div className="text-2xl font-medium text-[#1D9E75] mt-1">#{userRank}</div>
                    <div className="text-xs text-[#0F6E56]">dari {ranking.length} peserta</div>
                  </div>
                )}

                {/* Challenge */}
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                  <div className="text-xs font-medium text-amber-700 mb-1">🎯 Tantangan Minggu Ini</div>
                  <div className="text-sm font-medium text-amber-800">Pekan Tanpa Mobil</div>
                  <div className="text-xs text-amber-600 mt-1">Input 5 trip transportasi umum</div>
                  <div className="text-xs text-amber-500 mt-3">Hadiah: +500 poin</div>
                </div>
              </div>

              {/* Ranking list */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Semua Peserta</div>
                <div className="space-y-2">
                  {ranking.map((r, i) => (
                    <div key={r.id}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
                        r.id === user?.id ? 'bg-[#E1F5EE] border border-[#9FE1CB]' : 'bg-gray-50'
                      }`}>
                      <div className="w-6 text-sm font-medium text-gray-400 text-center">
                        {i < 3 ? medals[i] : i + 1}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-medium">
                        {(r.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${r.id === user?.id ? 'text-[#085041]' : 'text-gray-700'}`}>
                          {r.username || 'User'} {r.id === user?.id && '(Kamu)'}
                        </div>
                        <div className="text-xs text-gray-400">{r.kota}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[#1D9E75]">{r.total_hemat.toFixed(1)} kg</div>
                        <div className="text-xs text-gray-400">CO₂ hemat</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
