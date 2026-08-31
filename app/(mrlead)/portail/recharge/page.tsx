import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { formatEuros } from '@/lib/tva'
import PortalHeader from '../PortalHeader'
import RechargeForm from './RechargeForm'

export const dynamic = 'force-dynamic'

export default async function PortalRechargePage() {
  const client = await getPortalClient()
  if (!client) redirect('/login')

  const priceAgg = await prisma.dossier.aggregate({
    _avg: { unitPrice: true },
    where: { campagne: { clientId: client.id }, unitPrice: { gt: 0 } },
  })
  const avgPrice = priceAgg._avg.unitPrice ?? 0

  return (
    <>
      <PortalHeader clientName={client.name} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Link href="/portail" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6A4FE6] hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour
        </Link>

        <h1 className="mt-3 font-bricolage text-2xl font-bold tracking-tight">Recharger votre solde</h1>
        <p className="mt-1 text-sm text-[#787C8A]">
          Choisissez un nombre de leads ou un montant. Votre solde actuel : <strong className="text-[#16171D]">{formatEuros(client.prepaidBalance)}</strong>.
        </p>

        <div className="mt-6">
          <RechargeForm avgPrice={avgPrice} />
        </div>
      </main>
    </>
  )
}
