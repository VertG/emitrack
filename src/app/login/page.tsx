"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function HomePage() {
   const { user, loading, signInWithGoogle } = useAuth();
   const router = useRouter();

   useEffect(() => {
      if (!loading && user) router.push("/dashboard");
   }, [user, loading, router]);

   return (
      <div className="min-h-screen w-full overflow-hidden relative bg-white">
         {/*
        ── Bentuk hijau organic (SVG full-screen) ──
        ViewBox 1600×900 (landscape 16:9).
        Path dibuat clockwise dari pojok kanan atas:

          M 1600 0          → pojok kanan atas
          L 1600 900        → pojok kanan bawah
          L 680  900        → kiri bawah panel hijau (~42%)
          C 610 700,        → CP1: kurva kiri saat naik
            595 480,        → CP2: titik paling kiri di tengah (~37%)
            635 280         → keluar dari lembah, mulai naik ke kanan
          C 670  80,        → CP1: mendekati bagian atas, naik ke kanan
            770  0,         → CP2: hampir di atas
            900 0           → kiri atas panel hijau (~56%)
          Z
      */}
         <svg
            className="hidden md:block absolute inset-0 w-full h-full z-0 pointer-events-none"
            viewBox="0 0 950 900"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
         >
            <path
               d="M 950 0 L 950 900 L 520 900 C 620 500, 370 400, 470 0 Z"
               fill="#15594B"
            />
         </svg>

         {/* Mobile background (stacked) */}
         <div className="md:hidden absolute inset-0 w-full h-full z-0 flex flex-col bg-[#15594B]">
            <div className="h-[40%] bg-white rounded-b-[40px] sm:rounded-b-[60px] shadow-sm z-10 w-full"></div>
         </div>

         {/* ── Layer konten (di atas SVG) ── */}
         <div className="relative z-10 min-h-screen flex flex-col md:flex-row">
            {/* Kiri/Atas — area putih, logo di tengah */}
            <div className="h-[40vh] md:h-auto md:flex-1 flex flex-col items-center md:items-start justify-center pt-8 md:pt-10 px-6 md:pl-16 lg:pl-24 xl:pl-32">
               <Image
                  src="/EmiTrackLogo2.png"
                  alt="Logo EmiTrack"
                  width={450}
                  height={160}
                  className="object-contain w-64 sm:w-72 md:w-80 lg:w-[400px] xl:w-[450px]"
               />
            </div>

            {/* Kanan/Bawah — area hijau, konten login */}
            <div className="flex-1 md:w-[40%] lg:w-[40%] xl:w-[35%] flex flex-col justify-center px-8 sm:px-12 md:pl-12 lg:pl-16 xl:pl-24 md:pr-16 lg:pr-24 xl:pr-32 py-10 md:py-0">
               <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-2 md:mb-1 text-center">
                  Masuk ke EmiTrack
               </h2>
               <p className="text-sm sm:text-base lg:text-lg text-gray-300 mb-8 text-center">
                  Mulai lacak jejak karbon kamu hari ini
               </p>

               <button
                  onClick={signInWithGoogle}
                  className="w-full max-w-[450px] mx-auto flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 rounded-3xl text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all duration-300"
               >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                     <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                     />
                     <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                     />
                     <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                     />
                     <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                     />
                  </svg>
                  Masuk dengan Google
               </button>

               <p className="text-center text-xs sm:text-sm text-[#E2E8F0] mt-6 px-4">
                  Dengan masuk, kamu menyetujui penggunaan data untuk tujuan
                  lingkungan
               </p>

               <div className="mt-10 flex justify-center">
                  <button
                     onClick={() => router.push("/")}
                     className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-[#9FE1CB] hover:text-white transition-colors cursor-pointer"
                  >
                     <svg
                        className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                     </svg>
                     Kembali ke Beranda
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
