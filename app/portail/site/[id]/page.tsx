import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { coerceExtra } from '@/lib/leadExtra'
import PortalHeader from '../../PortalHeader'
import PortalLeadsList, { type PortalLeadRow } from '../../PortalLeadsList'

export const dynamic = 'force-dynamic'

export default async function PortalSiteLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient()
  if (!client) redirect('/login')

  const { id } = await params
  // On vérifie que le site appartient bien à ce client (isolation).
  const site = await prisma.dossier.findFirst({
    where: { id, campagne: { clientId: client.id } },
    select: { id: true, name: true, unitPrice: true, campagne: { select: { name: true } } },
  })
  if (!site) redirect('/portail')

  const leads = await prisma.inboundLead.findMany({
    where: { status: 'VALID', forwardedToClient: true, assignedToJboost: false, dossierId: site.id },
    orderBy: { receivedAt: 'desc' },
    select: { id: true, name: true, email: true, phone: true, message: true, source: true, extra: true, receivedAt: true, dossier: { select: { name: true } } },
  })

  const rows: PortalLeadRow[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    extra: coerceExtra(l.extra),
    receivedAt: l.receivedAt.toISOString(),
    siteName: l.dossier.name,
  }))

  return (
    <>
      <PortalHeader clientName={client.name} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/portail" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6A4FE6] hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour
        </Link>
        <h1 className="mt-3 font-bricolage text-2xl font-bold tracking-tight">{site.name}</h1>
        <p className="mt-1 text-sm text-[#787C8A]">
          {site.campagne.name} · {site.unitPrice.toFixed(2)} € HT / lead · {rows.length} lead{rows.length > 1 ? 's' : ''} reçu{rows.length > 1 ? 's' : ''}
        </p>
        <div className="mt-6"><PortalLeadsList rows={rows} showSite={false} /></div>
      </main>
    </>
  )
}
