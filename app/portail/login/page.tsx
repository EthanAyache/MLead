import { redirect } from 'next/navigation'
import { getPortalClient } from '@/lib/clientSession'
import PortalLoginForm from './PortalLoginForm'

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Déjà connecté → direct au tableau de bord.
  const client = await getPortalClient()
  if (client) redirect('/portail')

  const { error } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6A4FE6] text-white font-bricolage font-extrabold">M</span>
          <span className="font-bricolage text-lg font-extrabold tracking-tight">MonsieurLead</span>
        </div>
        <div className="rounded-2xl border border-[#E8E9EF] bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
          <PortalLoginForm initialError={error} />
        </div>
      </div>
    </main>
  )
}
