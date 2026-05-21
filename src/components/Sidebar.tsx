'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/kalkulator', label: 'Kalkulator', icon: '🧮' },
  { href: '/peta', label: 'Peta & Rute', icon: '🗺️' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <div className="w-52 min-h-screen bg-gray-50 border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="text-[#1D9E75] text-lg font-semibold">EmiTrack</div>
        <div className="text-gray-400 text-[10px] tracking-widest">JEJAK EMISIMU</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
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
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-4">
        <div className="text-xs text-gray-500 truncate mb-2">{user?.email}</div>
        <button onClick={signOut}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Keluar
        </button>
      </div>
    </div>
  )
}
