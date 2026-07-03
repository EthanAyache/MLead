import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ttcFromHt, formatEuros } from '@/lib/tva'
import Header from '@/app/dashboard/Header'
import DossierSettings from './DossierSettings'
import LeadsList, { type LeadRow } from './LeadsList'
import ContractTermsButton, { type OfferRow } from './ContractTermsButton'
import LeadsExportButtons, { type LeadExportRow } from '@/app/components/LeadsExportButtons'

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'monsieurlead.jboost.fr'
  const proto = h.get('x-forwarded-proto') || 'https'
  const origin = `${proto}://${host}`

  const { id } = await params
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      campagne: { include: { client: { select: { id: true, name: true } } } },
      leads: { orderBy: { receivedAt: 'desc' }, include: { chosenOffers: true } },
      offers: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!dossier) notFound()

  const offerRows: OfferRow[] = dossier.offers.map((o) => ({
    id: o.id,
    name: o.name,
    commissionType: o.commissionType,
    commissionValue: o.commissionValue,
    sellPrice: o.sellPrice,
    deposit: o.deposit,
  }))

  const isAdmin = me.role === 'ADMIN'

  // Ce que le client nous doit, sur le mois en cours.
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLeads = dossier.leads.filter((l) => l.receivedAt >= startOfMonth)
  const receivedThisMonth = monthLeads.length

  // 1) Par lead (pay-per-lead) : leads valides NON affectés à JBoost, PAS encore facturés × prix unitaire.
  //    (un lead déjà rattaché à une facture mensuelle ne fait plus partie du « dû ce mois »)
  const billableThisMonth = monthLeads.filter((l) => l.status === 'VALID' && !l.assignedToJboost && l.monthlyInvoiceId === null).length
  const duePerLead = billableThisMonth * dossier.unitPrice

  // 2) Par commission : leads affectés à JBoost ayant pris des offres → commission de chaque offre.
  const owedForOffer = (o: { commissionType: string; commissionValue: number; sellPrice: number }) =>
    o.commissionType === 'FIXED' ? o.commissionValue : (o.sellPrice * o.commissionValue) / 100
  const dueCommission = monthLeads
    .filter((l) => l.assignedToJboost)
    .reduce((sum, l) => sum + l.chosenOffers.reduce((s, o) => s + owedForOffer(o), 0), 0)

  // 3) Total dû
  const totalDue = duePerLead + dueCommission

  const rows: LeadRow[] = dossier.leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    assignedToJboost: l.assignedToJboost,
    receivedAt: l.receivedAt.toISOString(),
    billed: l.monthlyInvoiceId !== null,
  }))

  const exportRows: LeadExportRow[] = dossier.leads.map((l) => ({
    receivedAt: l.receivedAt.toISOString(),
    name: l.name, email: l.email, phone: l.phone, message: l.message, source: l.source,
    status: l.status,
    assignedToJboost: l.assignedToJboost,
    clientName: dossier.campagne.client.name,
    campagneName: dossier.campagne.name,
    siteName: dossier.name,
    offers: l.chosenOffers.map((o) => o.name).join(', '),
  }))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Link href={`/campagnes/${dossier.campagne.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">← Sites de la campagne {dossier.campagne.name}</Link>

          <div className="flex items-start justify-between gap-4 mt-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {dossier.campagne.client.name} · {dossier.campagne.name}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">{dossier.name}</h1>
                <ContractTermsButton dossierId={dossier.id} offers={offerRows} />
              </div>
              <p className="text-gray-400 text-xs mt-1">Site (source) — reçoit les leads via son lien API</p>
            </div>
            <LeadsExportButtons rows={exportRows} title={`Leads — ${dossier.name}`} fileBase={`leads-${dossier.name}`} />
          </div>

          {/* Ce que le client nous doit ce mois-ci */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Reçus ce mois</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{receivedThisMonth}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{billableThisMonth} facturable{billableThisMonth > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Dû par lead (HT)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{duePerLead.toFixed(2)} € <span className="text-sm font-semibold text-gray-400">HT</span></div>
              <div className="text-[11px] text-gray-400 mt-0.5">{billableThisMonth} × {dossier.unitPrice.toFixed(2)} € · {formatEuros(ttcFromHt(duePerLead))} TTC</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Dû par commission</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{dueCommission.toFixed(2)} €</div>
              <div className="text-[11px] text-gray-400 mt-0.5">offres prises (leads appelés par JBoost)</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="text-xs font-semibold text-blue-700 uppercase">Total dû ce mois</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{totalDue.toFixed(2)} €</div>
              <div className="text-[11px] text-blue-500/70 mt-0.5">par lead + commission</div>
            </div>
          </div>

          <DossierSettings
            dossierId={dossier.id}
            token={dossier.token}
            unitPrice={dossier.unitPrice}
            active={dossier.active}
            isAdmin={isAdmin}
            origin={origin}
            notifyEmails={dossier.notifyEmails ?? ''}
            department={dossier.department}
          />

          <LeadsList rows={rows} clientName={dossier.campagne.client.name} />
        </div>
      </main>
    </>
  )
}
