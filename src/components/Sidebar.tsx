'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: '📊' },
  { href: '/kalkulator', label: 'Kalkulator', shortLabel: 'Hitung', icon: '🧮' },
  { href: '/peta', label: 'Peta & Rute', shortLabel: 'Peta', icon: '🗺️' },
  { href: '/edukasi', label: 'Edukasi & Tips', shortLabel: 'Edukasi', icon: '📚' },
  { href: '/leaderboard', label: 'Leaderboard', shortLabel: 'Ranking', icon: '🏆' },
  { href: '/riwayat', label: 'Riwayat', shortLabel: 'Riwayat', icon: '📋' },
]

// Mobile bottom nav items (max 5 for space)
const mobileNavItems = [
  { href: '/dashboard', shortLabel: 'Home', icon: '📊' },
  { href: '/kalkulator', shortLabel: 'Hitung', icon: '🧮' },
  { href: '/peta', shortLabel: 'Peta', icon: '🗺️' },
  { href: '/riwayat', shortLabel: 'Riwayat', icon: '📋' },
  { href: '/profil', shortLabel: 'Profil', icon: '👤' },
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
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Separator */}
          <div className="mx-4 my-3 border-t border-gray-100" />
          <div className="text-[10px] text-gray-400 tracking-widest px-4 py-2 uppercase">Lainnya</div>

          {/* Beranda */}
          <Link href="/"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              pathname === '/'
                ? 'text-[#1D9E75] bg-white border-[#1D9E75] font-medium'
                : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-700'
            }`}>
            <span>🏠</span>
            Beranda
          </Link>

          {/* Profil */}
          <Link href="/profil"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              pathname === '/profil'
                ? 'text-[#1D9E75] bg-white border-[#1D9E75] font-medium'
                : 'text-gray-500 border-transparent hover:bg-white hover:text-gray-700'
            }`}>
            <span>👤</span>
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
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              pathname === item.href ? 'text-[#1D9E75]' : 'text-gray-400'
            }`}>
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium leading-none mt-0.5">{item.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
