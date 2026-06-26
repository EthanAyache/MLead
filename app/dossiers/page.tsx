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

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dossiers (réception de leads)</h1>
              <p className="text-gray-500 text-sm mt-1">
                {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} · une source/site par dossier, avec son lien API et son prix par lead
              </p>
            </div>
            <DossierForm clients={clients} />
          </div>

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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Dossier</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Client</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Prix / lead</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Leads reçus</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">État</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-gray-600">{d.client.name}</td>
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
