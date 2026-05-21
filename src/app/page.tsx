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
            className="absolute inset-0 w-full h-full z-0 pointer-events-none"
            viewBox="0 0 950 900"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
         >
            <path
               d="M 1600 0 L 1600 900 L 500 900 C 780 300, 350 350, 380 0 Z"
               fill="#15594B"
            />
         </svg>

         {/* ── Layer konten (di atas SVG) ── */}
         <div className="relative z-10 min-h-screen flex">
            {/* Kiri — area putih, logo di tengah */}
            <div className="flex-1 flex flex-col items-start justify-center pt-10 pl-95">
               <Image
                  src="/EmiTrackLogo2.png"
                  alt="Logo EmiTrack"
                  width={450}
                  height={160}
                  className="object-contain"
               />
            </div>

            {/* Kanan — area hijau, konten login */}
            <div className="w-[30%] flex flex-col justify-center pl-[5px] pr-[170px]">
               <h2 className="text-5xl font-semibold text-white mb-1 text-center">
                  Masuk ke EmiTrack
               </h2>
               <p className="text-lg text-gray-300 mb-8 text-center">
                  Mulai lacak jejak karbon kamu hari ini
               </p>

               <button
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 rounded-3xl text-sm font-semibold text-gray-700 hover:bg-gray-300/90 hover:shadow-lg active:scale-95 transition-all duration-300"
               >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

               <p className="text-center text-sm text-[#E2E8F0] mt-6">
                  Dengan masuk, kamu menyetujui penggunaan data untuk tujuan
                  lingkungan
               </p>
            </div>
         </div>
      </div>
   );
}
