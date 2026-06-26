import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import DossierSettings from './DossierSettings'
import LeadsList, { type LeadRow } from './LeadsList'
import ContractTermsButton from './ContractTermsButton'

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
      leads: { orderBy: { receivedAt: 'desc' } },
    },
  })
  if (!dossier) notFound()

  const isAdmin = me.role === 'ADMIN'

  // Compteur du mois en cours. Les leads affectés à JBoost sont exclus de la facturation.
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const billableThisMonth = dossier.leads.filter(
    (l) => l.status === 'VALID' && !l.assignedToJboost && l.receivedAt >= startOfMonth,
  ).length
  const receivedThisMonth = dossier.leads.filter((l) => l.receivedAt >= startOfMonth).length
  const forecast = billableThisMonth * dossier.unitPrice

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
                <ContractTermsButton dossierId={dossier.id} terms={dossier.contractTerms} />
              </div>
              <p className="text-gray-400 text-xs mt-1">Site (source) — reçoit les leads via son lien API</p>
            </div>
          </div>

          {/* KPIs du mois */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Reçus ce mois</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{receivedThisMonth}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Facturables ce mois</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{billableThisMonth}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Valides, hors affectés à JBoost</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="text-xs font-semibold text-blue-700 uppercase">Montant prévisionnel</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{forecast.toFixed(2)} €</div>
            </div>
          </div>

          <DossierSettings
            dossierId={dossier.id}
            token={dossier.token}
            unitPrice={dossier.unitPrice}
            active={dossier.active}
            isAdmin={isAdmin}
            origin={origin}
          />

          <LeadsList rows={rows} clientName={dossier.campagne.client.name} />
        </div>
      </main>
    </>
  )
}
