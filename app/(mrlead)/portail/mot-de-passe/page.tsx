import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import SetPasswordForm from './SetPasswordForm'

export const dynamic = 'force-dynamic'

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  // Validation légère du jeton pour afficher le bon écran (la vraie vérif se refait au POST).
  let valid = false
  if (token) {
    const row = await prisma.clientLoginToken.findUnique({ where: { token }, select: { expiresAt: true, usedAt: true } })
    valid = !!row && !row.usedAt && row.expiresAt > new Date()
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6A4FE6] text-white font-bricolage font-extrabold">M</span>
          <span className="font-bricolage text-lg font-extrabold tracking-tight">MonsieurLead</span>
        </div>
        <div className="rounded-2xl border border-[#E8E9EF] bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
          {valid && token ? (
            <SetPasswordForm token={token} />
          ) : (
            <div className="text-center">
              <h1 className="font-bricolage text-xl font-bold">Lien invalide ou expiré</h1>
              <p className="mt-2 text-sm text-[#787C8A] leading-relaxed">Ce lien n&apos;est plus valable. Redemandez-en un depuis la page de connexion.</p>
              <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#6A4FE6] px-5 font-semibold text-white transition hover:bg-[#5840CC]">
                Aller à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
