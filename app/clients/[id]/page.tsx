import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import CampagneForm from './CampagneForm'
import LeadsExportButtons, { type LeadExportRow } from '@/app/components/LeadsExportButtons'

export default async function ClientCampagnesPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const { id } = await params
  const filter = visibilityFilter(me)

  const client = await prisma.client.findFirst({
    where: { id, ...filter },
    include: {
      campagnes: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sites: true } } },
      },
    },
  })
  if (!client) notFound()

  // Tous les leads du client (tous sites confondus), pour l'export.
  const leads = await prisma.inboundLead.findMany({
    where: { dossier: { campagne: { clientId: id } } },
    orderBy: { receivedAt: 'desc' },
    include: {
      chosenOffers: { select: { name: true } },
      dossier: { include: { campagne: { select: { name: true } } } },
    },
  })
  const exportRows: LeadExportRow[] = leads.map((l) => ({
    receivedAt: l.receivedAt.toISOString(),
    name: l.name, email: l.email, phone: l.phone, message: l.message, source: l.source,
    status: l.status,
    assignedToJboost: l.assignedToJboost,
    clientName: client.name,
    campagneName: l.dossier.campagne.name,
    siteName: l.dossier.name,
    offers: l.chosenOffers.map((o) => o.name).join(', '),
  }))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/clients" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour aux clients
          </Link>

          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg">
                {client.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-500 text-sm">
                  {client.campagnes.length} campagne{client.campagnes.length > 1 ? 's' : ''}
                  {client.email ? ` · ${client.email}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <LeadsExportButtons rows={exportRows} title={`Leads — ${client.name}`} fileBase={`leads-${client.name}`} />
              <CampagneForm client={{ id: client.id, name: client.name }} />
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            Une <strong>campagne</strong> regroupe les <strong>sites</strong> d&apos;un même thème. Chaque site a son propre lien API et son prix par lead.
          </p>

          {client.campagnes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              Aucune campagne pour ce client. Clique sur « + Nouvelle campagne » pour commencer.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.campagnes.map((c) => (
                <Link
                  key={c.id}
                  href={`/campagnes/${c.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <h2 className="text-lg font-bold text-gray-900">{c.name}</h2>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {c._count.sites} site{c._count.sites > 1 ? 's' : ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
