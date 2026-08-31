import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/(mrlead)/dashboard/Header'
import AutoRefresh from '@/app/(mrlead)/components/AutoRefresh'
import { coerceExtra } from '@/lib/leadExtra'
import LeadsExportTable, { type ExportRow } from './LeadsExportTable'
import AddLeadModal from '@/app/(mrlead)/components/AddLeadModal'

export default async function LeadsRecusPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const filter = visibilityFilter(me)

  const leads = await prisma.inboundLead.findMany({
    where: { dossier: { campagne: { client: filter } } },
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
    extra: coerceExtra(l.extra),
    note: l.note,
  }))

  // Sites disponibles pour l'ajout manuel d'un lead
  const sitesRaw = await prisma.dossier.findMany({
    where: { campagne: { client: filter } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, campagne: { select: { name: true, client: { select: { name: true } } } } },
  })
  const sites = sitesRaw.map((s) => ({ id: s.id, label: `${s.campagne.client.name} · ${s.campagne.name} · ${s.name}` }))

  return (
    <>
      <Header />
      <AutoRefresh />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour au dashboard
          </Link>

          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tous les leads reçus</h1>
              <p className="text-gray-500 text-sm mt-1">
                {rows.length} lead{rows.length > 1 ? 's' : ''} reçu{rows.length > 1 ? 's' : ''}, tous clients/campagnes/sites confondus. Exportable en Excel, CSV ou PDF.
              </p>
            </div>
            <AddLeadModal sites={sites} />
          </div>

          <LeadsExportTable rows={rows} isAdmin={me.role === 'ADMIN'} />
        </div>
      </main>
    </>
  )
}
