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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Mr.Lead"
        className="w-[34px] h-[34px] rounded-[9px] object-cover border border-white/25 group-hover:opacity-90 transition"
      />
      <div className="font-bricolage font-extrabold text-[20px] text-white tracking-tight leading-tight">
        Mr.Lead
        <div className="font-jakarta font-medium text-[11.5px] text-white/70 -mt-0.5">
          Monsieur Lead — Espace facturation
        </div>
      </div>
    </Link>
  )
}
