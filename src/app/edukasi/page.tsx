'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { hitungEmisi, BBM_OPTIONS, LABEL_BBM } from '@/lib/emisi'
import { Info, Leaf, Car, Trees, TrendingUp, AlertTriangle, Bus, Bike, Wind, PowerOff, Users, Zap, Globe, Target } from 'lucide-react'

export default function EdukasiPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Interactive Calculator State
  const [jarak, setJarak] = useState<number>(20)
  const [jenis, setJenis] = useState<'motor' | 'mobil'>('motor')
  const [bbm, setBbm] = useState<string>('ron92')
  const [hasilEmisi, setHasilEmisi] = useState<number>(0)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    setHasilEmisi(hitungEmisi(jenis, bbm, jarak))
  }, [jarak, jenis, bbm])

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-col">
          <div className="font-medium text-gray-800 flex items-center gap-2">
            📚 Edukasi & Tips
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Pahami emisimu, ubah kebiasaanmu</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-8 overflow-y-auto space-y-8">
          
          {/* SECTION: Tahukah Kamu */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#1D9E75]" /> Tahukah Kamu?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl flex-shrink-0 text-[#1D9E75] shadow-sm">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#085041] mb-2 leading-snug">
                    Kendaraan pribadi menyumbang 47% emisi CO₂ di sektor transportasi Indonesia.
                  </div>
                  <div className="text-[10px] text-[#1D9E75] uppercase font-bold tracking-wider">
                    Sumber: KLHK, 2022
                  </div>
                </div>
              </div>

              <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl flex-shrink-0 text-[#1D9E75] shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#085041] mb-2 leading-snug">
                    Jakarta konsisten masuk daftar kota dengan polusi udara terburuk dunia.
                  </div>
                  <div className="text-[10px] text-[#1D9E75] uppercase font-bold tracking-wider">
                    Sumber: IQAir, 2023
                  </div>
                </div>
              </div>

              <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl flex-shrink-0 text-[#1D9E75] shadow-sm">
                  <Trees className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#085041] mb-2 leading-snug">
                    1 pohon dewasa rata-rata menyerap sekitar 21 kg CO₂ per tahun.
                  </div>
                  <div className="text-[10px] text-[#1D9E75] uppercase font-bold tracking-wider">
                    Fakta Lingkungan
                  </div>
                </div>
              </div>

              <div className="bg-[#E1F5EE] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl flex-shrink-0 text-[#1D9E75] shadow-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#085041] mb-2 leading-snug">
                    Jumlah kendaraan Indonesia tumbuh 5-7% per tahun, sudah tembus lebih dari 150 juta unit.
                  </div>
                  <div className="text-[10px] text-[#1D9E75] uppercase font-bold tracking-wider">
                    Sumber: BPS, 2023
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: Kalkulator & Rumus */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Bagaimana Emisi Dihitung?
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
                <div className="bg-gray-800 text-green-400 font-mono text-center py-4 rounded-xl mb-6 text-xl tracking-widest shadow-inner">
                  E = D × FE × FK
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">D</span>
                      Jarak Tempuh (km)
                    </div>
                    <div className="text-xs text-gray-500 ml-8">
                      Jarak total perjalanan harianmu.
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center text-xs">FE</span>
                      Faktor Emisi
                    </div>
                    <div className="text-xs text-gray-500 ml-8 space-y-1">
                      <div className="font-medium text-gray-700">Bensin (kg CO₂/liter):</div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                        <span>RON 90</span> <span className="font-medium text-gray-700">2.30</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1 pt-1">
                        <span>RON 92</span> <span className="font-medium text-gray-700">2.31</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1 pt-1">
                        <span>RON 95</span> <span className="font-medium text-gray-700">2.33</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1 pt-1">
                        <span>RON 98</span> <span className="font-medium text-gray-700">2.35</span>
                      </div>
                      <div className="font-medium text-gray-700 mt-2">Diesel (kg CO₂/liter):</div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                        <span>CN 48 (Solar)</span> <span className="font-medium text-gray-700">2.67</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1 pt-1">
                        <span>CN 51 (Dexlite)</span> <span className="font-medium text-gray-700">2.65</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>CN 53 (Premium)</span> <span className="font-medium text-gray-700">2.63</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-2 italic leading-tight">
                        *RON (Research Octane Number) adalah standar internasional yang berlaku untuk semua merek BBM — Pertamina, Shell, Vivo, BP, Total, dll.
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center text-xs">FK</span>
                      Konsumsi BBM
                    </div>
                    <div className="text-xs text-gray-500 ml-8 space-y-1">
                      <div>Kebutuhan bahan bakar per km:</div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-1 pt-1">
                        <span>Motor (rata-rata)</span> <span className="font-medium text-gray-700">0.043 liter/km</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>Mobil (rata-rata)</span> <span className="font-medium text-gray-700">0.120 liter/km</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-gray-400 text-center italic mt-4">
                    Sumber data: IPCC 2021 + Kementerian ESDM RI
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:w-1/2 flex flex-col justify-center">
                <div className="mb-6 text-center">
                  <div className="text-sm font-bold text-gray-800 mb-2">Simulasi Cepat</div>
                  <div className="text-xs text-gray-500">Ubah nilai di bawah untuk melihat efek emisi.</div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Jarak Tempuh (km)</label>
                    <input 
                      type="number" 
                      value={jarak || ''} 
                      onChange={e => setJarak(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Kendaraan</label>
                      <select 
                        value={jenis} 
                        onChange={e => { setJenis(e.target.value as 'motor' | 'mobil'); setBbm('ron92') }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
                      >
                        <option value="motor">Motor</option>
                        <option value="mobil">Mobil</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">BBM</label>
                      <select 
                        value={bbm} 
                        onChange={e => setBbm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30"
                      >
                        {BBM_OPTIONS[jenis].map(b => (
                          <option key={b} value={b}>{LABEL_BBM[b]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-[#E1F5EE] rounded-xl p-5 text-center border border-[#9FE1CB]">
                  <div className="text-xs text-[#085041] mb-2 font-medium leading-relaxed">
                    Jarak <span className="font-bold">{jarak} km</span> dengan <span className="font-bold capitalize">{jenis}</span> <span className="font-bold">{LABEL_BBM[bbm]}</span> menghasilkan:
                  </div>
                  <div className="text-3xl font-black text-[#1D9E75]">
                    {hasilEmisi.toFixed(2)} <span className="text-sm font-bold">kg CO₂</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: Tips */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" /> Tips Kurangi Emisi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: <Bus className="w-5 h-5" />,
                  title: "Gunakan Transportasi Umum",
                  desc: "TransJakarta menghasilkan 96% lebih sedikit emisi dibanding mobil pribadi per penumpang.",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  border: "border-blue-100"
                },
                {
                  icon: <Bike className="w-5 h-5" />,
                  title: "Bersepeda untuk Jarak Dekat",
                  desc: "Perjalanan < 5 km? Bersepeda = 0 emisi CO₂ dan jauh lebih menyehatkan tubuh!",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  border: "border-emerald-100"
                },
                {
                  icon: <Wind className="w-5 h-5" />,
                  title: "Jaga Tekanan Ban",
                  desc: "Ban kurang angin meningkatkan gesekan dan konsumsi BBM hingga 3% — rutinlah cek tekanan ban.",
                  color: "text-amber-600",
                  bg: "bg-amber-50",
                  border: "border-amber-100"
                },
                {
                  icon: <PowerOff className="w-5 h-5" />,
                  title: "Kurangi Idle Engine",
                  desc: "Mesin menyala tanpa bergerak tetap membakar BBM. Matikan mesin jika berhenti > 1 menit.",
                  color: "text-rose-600",
                  bg: "bg-rose-50",
                  border: "border-rose-100"
                },
                {
                  icon: <Users className="w-5 h-5" />,
                  title: "Carpooling",
                  desc: "Berbagi kendaraan dengan rekan kerja efektif membagi jejak karbonmu sesuai jumlah penumpang.",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  border: "border-purple-100"
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: "Pertimbangkan Kendaraan Listrik",
                  desc: "Motor listrik menghasilkan 63% lebih sedikit emisi (grid Indonesia) dibanding motor bensin.",
                  color: "text-cyan-600",
                  bg: "bg-cyan-50",
                  border: "border-cyan-100"
                }
              ].map((tip, i) => (
                <div key={i} className={`rounded-2xl border p-4 flex gap-4 ${tip.bg} ${tip.border}`}>
                  <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm ${tip.color}`}>
                    {tip.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1">{tip.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION: SDG 11 */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-500" /> EmiTrack & Tujuan Pembangunan Berkelanjutan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-[#0369A1] text-white text-xs font-black px-2 py-1 rounded">SDG 11.2</div>
                  <div className="text-sm font-bold text-[#0369A1]">Transportasi Berkelanjutan</div>
                </div>
                <p className="text-xs text-[#075985] leading-relaxed">
                  Menyediakan akses sistem transportasi yang aman, terjangkau, mudah diakses, dan berkelanjutan untuk semua, dengan meningkatkan keselamatan jalan raya.
                </p>
              </div>

              <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-[#0369A1] text-white text-xs font-black px-2 py-1 rounded">SDG 11.6</div>
                  <div className="text-sm font-bold text-[#0369A1]">Kurangi Dampak Kota</div>
                </div>
                <p className="text-xs text-[#075985] leading-relaxed">
                  Mengurangi dampak lingkungan negatif per kapita di perkotaan, termasuk dengan memberi perhatian khusus pada kualitas udara.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
