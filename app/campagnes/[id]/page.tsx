import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import DossierForm from '@/app/dossiers/DossierForm'

export default async function CampagneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const { id } = await params
  const filter = visibilityFilter(me)

  const campagne = await prisma.campagne.findFirst({
    where: { id, client: filter },
    include: {
      client: { select: { id: true, name: true } },
      sites: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { leads: true } } },
      },
    },
  })
  if (!campagne) notFound()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <Link href={`/clients/${campagne.client.id}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Campagnes de {campagne.client.name}
          </Link>

          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
                Client : {campagne.client.name}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{campagne.name}</h1>
              <p className="text-gray-400 text-xs mt-1">Campagne — clique sur un site pour voir ses leads et son lien API</p>
            </div>
            <DossierForm campagne={{ id: campagne.id, name: campagne.name }} />
          </div>

          {campagne.sites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm mt-4">
              Aucun site dans cette campagne. Clique sur « + Nouveau site » pour générer un lien API.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Site</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Prix / lead</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Leads reçus</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">État</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {campagne.sites.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{s.unitPrice.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">{s._count.leads}</td>
                      <td className="px-4 py-3">
                        {s.active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Actif</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Inactif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dossiers/${s.id}`} className="text-blue-600 hover:text-blue-700 font-semibold">Ouvrir →</Link>
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
