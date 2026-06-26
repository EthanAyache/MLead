import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import DossierForm from '@/app/dossiers/DossierForm'

export default async function ClientDossiersPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const { id } = await params
  const filter = visibilityFilter(me)

  const client = await prisma.client.findFirst({
    where: { id, ...filter },
    include: {
      dossiers: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { leads: true } } },
      },
    },
  })
  if (!client) notFound()

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
                  {client.dossiers.length} campagne{client.dossiers.length > 1 ? 's' : ''}
                  {client.email ? ` · ${client.email}` : ''}
                </p>
              </div>
            </div>
            <DossierForm fixedClient={{ id: client.id, name: client.name }} />
          </div>

          <p className="text-xs text-gray-400 mb-6">
            Une <strong>campagne</strong> = une source/un site de ce client. Chacune a son propre lien API et son prix par lead, ce qui permet de savoir d&apos;où vient chaque lead.
          </p>

          {client.dossiers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              Aucune campagne pour ce client. Clique sur « + Nouvelle campagne » pour générer un lien API.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Campagne</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Prix / lead</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Leads reçus</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">État</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {client.dossiers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{d.unitPrice.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">{d._count.leads}</td>
                      <td className="px-4 py-3">
                        {d.active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Actif</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Inactif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dossiers/${d.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">Ouvrir →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
