'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LogoLink() {
  const router = useRouter()

  return (
    <Link
      href="/dashboard"
      onClick={() => router.refresh()}
      aria-label="Retour au tableau de bord"
      className="flex items-center gap-[11px] group cursor-pointer"
    >
      <div className="w-[34px] h-[34px] rounded-[9px] bg-white/[0.18] border border-white/25 flex items-center justify-center text-white font-bricolage font-extrabold text-sm backdrop-blur-sm group-hover:bg-white/[0.28] transition">
        ML
      </div>
      <div className="font-bricolage font-extrabold text-[20px] text-white tracking-tight leading-tight">
        Mr.Lead
        <div className="font-jakarta font-medium text-[11.5px] text-white/70 -mt-0.5">
          Monsieur Lead — Espace facturation
        </div>
      </div>
    </Link>
  )
}
