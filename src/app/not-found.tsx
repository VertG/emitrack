import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#E1F5EE] flex flex-col items-center justify-center px-6 text-center">
      {/* Decorative blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-[#1D9E75] opacity-10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-60 h-60 bg-[#FAC775] opacity-10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        {/* Icon */}
        <div className="mb-2 animate-bounce select-none">
          <Image 
            src="/EmiTrackLogo3.png" 
            alt="EmiTrack" 
            width={80} 
            height={80} 
            className="object-contain mx-auto opacity-40"
          />
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-bold text-[#1D9E75] leading-none mb-4 tracking-tight">
          404
        </h1>

        {/* Title */}
        <h2 className="text-xl font-semibold text-[#085041] mb-3">
          Halaman Tidak Ditemukan
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-[#1D9E75] leading-relaxed mb-10">
          Sepertinya kamu salah jalan...
          <br />
          tapi setidaknya tidak menghasilkan emisi CO₂! 🚗💨
        </p>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#085041] active:scale-95 transition-all duration-200 shadow-sm"
          >
            🏠 Kembali ke Dashboard
          </Link>

          <Link
            href="/kalkulator"
            className="w-full sm:w-auto px-6 py-3 bg-transparent text-[#1D9E75] text-sm font-semibold rounded-xl border-2 border-[#1D9E75] hover:bg-[#1D9E75] hover:text-white active:scale-95 transition-all duration-200"
          >
            🧮 Kalkulator Emisi
          </Link>

          <Link
            href="/leaderboard"
            className="w-full sm:w-auto px-6 py-3 bg-transparent text-[#1D9E75] text-sm font-semibold rounded-xl border-2 border-[#1D9E75] hover:bg-[#1D9E75] hover:text-white active:scale-95 transition-all duration-200"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </div>

      {/* Footer tagline */}
      <p className="absolute bottom-6 text-xs text-[#085041] opacity-50 tracking-widest">
        EmiTrack · Jejak Emisimu, Aksimu · SDG 11
      </p>
    </div>
  )
}
