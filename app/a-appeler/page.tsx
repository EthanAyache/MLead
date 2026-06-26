import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import AppelerList, { type CallRow } from './AppelerList'

export default async function AAppelerPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const filter = visibilityFilter(me)

  // Tous les leads que NOUS (JBoost) devons appeler, quel que soit le client/site. (hors invalidés)
  const leads = await prisma.inboundLead.findMany({
    where: { assignedToJboost: true, status: { not: 'REJECTED' }, dossier: { campagne: { client: filter } } },
    orderBy: { receivedAt: 'desc' },
    include: {
      chosenOffers: { select: { id: true } },
      dossier: {
        include: {
          offers: { orderBy: { createdAt: 'asc' } },
          campagne: { include: { client: { select: { name: true } } } },
        },
      },
    },
  })

  // Ce que le CLIENT nous doit pour une offre prise = la commission (% du prix de vente, ou montant fixe).
  const owedForOffer = (o: { commissionType: string; commissionValue: number; sellPrice: number }) =>
    o.commissionType === 'FIXED' ? o.commissionValue : (o.sellPrice * o.commissionValue) / 100

  const rows: CallRow[] = leads.map((l) => {
    const chosenIds = new Set(l.chosenOffers.map((o) => o.id))
    const owed = l.dossier.offers.filter((o) => chosenIds.has(o.id)).reduce((s, o) => s + owedForOffer(o), 0)
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      message: l.message,
      source: l.source,
      receivedAt: l.receivedAt.toISOString(),
      clientName: l.dossier.campagne.client.name,
      campagneName: l.dossier.campagne.name,
      siteName: l.dossier.name,
      siteId: l.dossier.id,
      chosenOfferIds: [...chosenIds],
      owed,
      offers: l.dossier.offers.map((o) => ({ id: o.id, name: o.name })),
    }
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour au dashboard
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">À appeler</h1>
            <p className="text-gray-500 text-sm mt-1">
              Leads affectés à JBoost : c&apos;est <strong>nous</strong> qui les rappelons. Quand un lead accepte, choisis l&apos;offre qu&apos;il a prise.
            </p>
          </div>

          <AppelerList rows={rows} />
        </div>
      </main>
    </>
  )
}
