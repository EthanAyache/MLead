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

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const owedForLead = (l: (typeof leads)[number]) => {
    const chosenIds = new Set(l.chosenOffers.map((o) => o.id))
    return l.dossier.offers.filter((o) => chosenIds.has(o.id)).reduce((s, o) => s + owedForOffer(o), 0)
  }
  const totalOwedAll = leads.reduce((s, l) => s + owedForLead(l), 0)
  const totalOwedMonth = leads.reduce((s, l) => (l.receivedAt >= startOfMonth ? s + owedForLead(l) : s), 0)

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
      offers: l.dossier.offers.map((o) => ({
        id: o.id,
        name: o.name,
        commissionType: o.commissionType,
        commissionValue: o.commissionValue,
        sellPrice: o.sellPrice,
        deposit: o.deposit,
      })),
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

          {/* Totaux de nos appels (argent dû par les clients sur les offres prises) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Nos appels — ce mois</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{totalOwedMonth.toFixed(2)} €</div>
              <div className="text-[11px] text-gray-400 mt-0.5">commissions des offres prises ce mois</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="text-xs font-semibold text-blue-700 uppercase">Total (tout confondu)</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{totalOwedAll.toFixed(2)} €</div>
              <div className="text-[11px] text-blue-500/70 mt-0.5">depuis le début</div>
            </div>
          </div>

          <AppelerList rows={rows} />
        </div>
      </main>
    </>
  )
}
