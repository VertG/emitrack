import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { AuthProvider } from '@/context/AuthContext'
import ToastContainer from '@/components/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EmiTrack — Jejak Emisimu, Aksimu',
  description: 'Platform pelacak emisi kendaraan berbasis gamifikasi untuk mobilitas perkotaan berkelanjutan',
  icons: {
    icon: '/EmiTrackLogo3.png',
    apple: '/EmiTrackLogo3.png',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  )
}
