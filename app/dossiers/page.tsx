import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import DossierForm from './DossierForm'

export default async function DossiersPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const filter = visibilityFilter(me)

  const [dossiers, clients] = await Promise.all([
    prisma.dossier.findMany({
      where: { client: filter },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
    }),
    prisma.client.findMany({
      where: { archived: false, ...filter },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Regroupement des dossiers par client
  const groups = new Map<string, { name: string; dossiers: typeof dossiers }>()
  for (const d of dossiers) {
    const g = groups.get(d.client.id) ?? { name: d.client.name, dossiers: [] }
    g.dossiers.push(d)
    groups.set(d.client.id, g)
  }
  const grouped = [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))

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

          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dossiers (réception de leads)</h1>
              <p className="text-gray-500 text-sm mt-1">
                {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} chez {grouped.length} client{grouped.length > 1 ? 's' : ''}
              </p>
            </div>
            <DossierForm clients={clients} />
          </div>

          <p className="text-xs text-gray-400 mb-6">
            Un <strong>dossier</strong> = une source/un site d&apos;un client (avec son lien API et son prix par lead). Un même client peut avoir plusieurs dossiers.
          </p>

          {clients.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-4 text-sm">
              Aucun client pour le moment. Crée d&apos;abord un client dans <Link href="/clients" className="font-semibold underline">Clients</Link>, puis reviens créer son dossier.
            </div>
          )}

          {dossiers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              Aucun dossier. Crée un dossier pour générer un lien API et commencer à recevoir des leads.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([clientId, g]) => (
                <div key={clientId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* En-tête du client */}
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {g.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900 leading-tight">{g.name}</div>
                      <div className="text-xs text-gray-500">{g.dossiers.length} dossier{g.dossiers.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  {/* Dossiers du client */}
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs uppercase">Dossier</th>
                        <th className="text-right px-4 py-2 font-semibold text-gray-500 text-xs uppercase">Prix / lead</th>
                        <th className="text-right px-4 py-2 font-semibold text-gray-500 text-xs uppercase">Leads reçus</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs uppercase">État</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {g.dossiers.map((d) => (
                        <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
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
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
