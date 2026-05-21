'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Gift, Coffee, TreePine, ChevronRight } from 'lucide-react'

export default function RewardsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>

  const handleRedeem = () => {
    alert('Fitur Redeem akan hadir di Fase 2!')
  }

  const rewards = [
    {
      title: 'Voucher Transportasi Umum',
      description: 'Diskon Rp10.000 untuk perjalanan KRL, MRT, atau TransJakarta.',
      poin: 1500,
      icon: <Gift className="w-8 h-8 text-[#1D9E75]" />,
      color: 'bg-[#E1F5EE]',
    },
    {
      title: 'Diskon Kopi Ramah Lingkungan',
      description: 'Potongan 20% di coffee shop partner yang menggunakan cup biodegradable.',
      poin: 800,
      icon: <Coffee className="w-8 h-8 text-amber-600" />,
      color: 'bg-amber-50',
    },
    {
      title: 'Donasi Tanam 1 Pohon Asli',
      description: 'Kami akan menanam satu bibit pohon atas nama kamu melalui partner NGO.',
      poin: 3000,
      icon: <TreePine className="w-8 h-8 text-emerald-600" />,
      color: 'bg-emerald-50',
    }
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
          <div>
            <div className="font-medium text-gray-800">Tukar Poin</div>
            <div className="text-xs text-gray-400">Pilih reward untuk kontribusimu!</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Rewards Tersedia</h1>
            <p className="text-sm text-gray-500">
              Kumpulkan poin dengan memilih transportasi hijau dan tukarkan dengan berbagai hadiah menarik atau donasi nyata untuk lingkungan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rewards.map((r, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className={`w-14 h-14 rounded-full ${r.color} flex items-center justify-center mb-4`}>
                    {r.icon}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">{r.title}</h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{r.description}</p>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <div className="text-sm font-bold text-[#1D9E75]">{r.poin.toLocaleString()} Poin</div>
                  <button 
                    onClick={handleRedeem}
                    className="flex items-center gap-1 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Tukar <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
