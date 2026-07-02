export const revalidate = 30

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import LeadsExportTable, { type ExportRow } from '@/app/leads-recus/LeadsExportTable'

export default async function ApporteurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const { id } = await params
  const filter = visibilityFilter(me)

  const apporteur = await prisma.apporteur.findFirst({
    where: { id, ...filter },
    include: {
      clients: { where: { archived: false }, orderBy: { name: 'asc' }, select: { id: true, name: true } },
    },
  })
  if (!apporteur) notFound()

  // Tous les leads des clients apportés par cet apporteur
  const leads = await prisma.inboundLead.findMany({
    where: { dossier: { campagne: { client: { apporteurId: id, ...filter } } } },
    orderBy: { receivedAt: 'desc' },
    include: {
      chosenOffers: { select: { name: true } },
      dossier: { include: { campagne: { include: { client: { select: { name: true } } } } } },
    },
  })
  const rows: ExportRow[] = leads.map((l) => ({
    id: l.id,
    receivedAt: l.receivedAt.toISOString(),
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    source: l.source,
    status: l.status,
    assignedToJboost: l.assignedToJboost,
    billed: l.monthlyInvoiceId !== null,
    clientName: l.dossier.campagne.client.name,
    campagneName: l.dossier.campagne.name,
    siteName: l.dossier.name,
    offers: l.chosenOffers.map((o) => o.name).join(', '),
  }))

  const rate = apporteur.commissionType === 'PERCENT' ? `${apporteur.commissionValue} %` : `${apporteur.commissionValue} € / lead`

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto p-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-lg">
            {apporteur.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{apporteur.name}</h1>
            <p className="text-gray-500 text-sm">
              Apporteur d&apos;affaires · commission {rate}
              {apporteur.email ? ` · ${apporteur.email}` : ''}
            </p>
          </div>
        </div>

        {/* Clients apportés */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
            {apporteur.clients.length} client{apporteur.clients.length > 1 ? 's' : ''} apporté{apporteur.clients.length > 1 ? 's' : ''}
          </div>
          {apporteur.clients.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun client rattaché à cet apporteur.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {apporteur.clients.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-800 hover:border-blue-300 hover:bg-blue-50 transition shadow-sm">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mb-2">
          <h2 className="text-lg font-bold text-gray-900">Leads apportés</h2>
          <p className="text-gray-500 text-sm">
            {rows.length} lead{rows.length > 1 ? 's' : ''} généré{rows.length > 1 ? 's' : ''} par les clients de cet apporteur. Filtrable par dates, recherche, et exportable (Excel / CSV / PDF).
          </p>
        </div>

        <LeadsExportTable
          rows={rows}
          isAdmin={me.role === 'ADMIN'}
          exportTitle={`Leads apportés — ${apporteur.name}`}
          exportFileBase={`leads-apporteur-${apporteur.name}`}
        />
      </main>
    </div>
  )
}
