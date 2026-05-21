'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { BarChart2, Calculator, Map as MapIcon, BookOpen, Trophy, ClipboardList, User, Home } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: BarChart2 },
  { href: '/kalkulator', label: 'Kalkulator', shortLabel: 'Hitung', icon: Calculator },
  { href: '/peta', label: 'Peta & Rute', shortLabel: 'Peta', icon: MapIcon },
  { href: '/edukasi', label: 'Edukasi & Tips', shortLabel: 'Edukasi', icon: BookOpen },
  { href: '/leaderboard', label: 'Leaderboard', shortLabel: 'Ranking', icon: Trophy },
  { href: '/riwayat', label: 'Riwayat', shortLabel: 'Riwayat', icon: ClipboardList },
]

// Mobile bottom nav items (max 5 for space)
const mobileNavItems = [
  { href: '/dashboard', shortLabel: 'Home', icon: BarChart2 },
  { href: '/kalkulator', shortLabel: 'Hitung', icon: Calculator },
  { href: '/peta', shortLabel: 'Peta', icon: MapIcon },
  { href: '/riwayat', shortLabel: 'Riwayat', icon: ClipboardList },
  { href: '/profil', shortLabel: 'Profil', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex w-52 h-screen sticky top-0 bg-gray-50 border-r border-gray-100 flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100 shrink-0">
          <Image 
            src="/EmiTrackLogo1.png" 
            alt="EmiTrack" 
            width={110} 
            height={36} 
            className="object-contain"
          />
        </div>

        {/* Nav — scrollable if needed */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="text-[10px] text-gray-400 tracking-widest px-4 py-2 uppercase">Menu</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                pathname === item.href
                  ? 'text-[#1D9E75] bg-white border-[#1D9E75] font-medium'
                  : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-700'
              }`}>
              <item.icon size={18} strokeWidth={2} className="text-current shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Separator */}
          <div className="mx-4 my-3 border-t border-gray-100" />
          <div className="text-[10px] text-gray-400 tracking-widest px-4 py-2 uppercase">Lainnya</div>

          <Link href="/"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              pathname === '/'
                ? 'text-[#1D9E75] bg-white border-[#1D9E75] font-medium'
                : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-700'
            }`}>
            <Home size={18} strokeWidth={2} className="text-current shrink-0" />
            Beranda
          </Link>

          {/* Profil */}
          <Link href="/profil"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              pathname === '/profil'
                ? 'text-[#1D9E75] bg-white border-[#1D9E75] font-medium'
                : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-700'
            }`}>
            <User size={18} strokeWidth={2} className="text-current shrink-0" />
            Profil & Keluar
          </Link>
        </nav>

        {/* User footer — email only */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
        </div>
      </div>

      {/* ── Mobile bottom navigation (hidden on desktop) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-gray-100 flex safe-area-inset-bottom">
        {mobileNavItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
              pathname === item.href ? 'text-[#1D9E75]' : 'text-gray-400'
            }`}>
            <item.icon size={20} strokeWidth={1.5} className="text-current" />
            <span className="text-[10px] font-medium">{item.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
