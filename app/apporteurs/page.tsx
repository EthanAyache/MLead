import { prisma } from '@/lib/prisma'
import AddApporteurForm from './AddApporteurForm'

export default async function ApporteursPage() {
  const apporteurs = await prisma.apporteur.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apporteurs d'affaires</h1>
            <p className="text-gray-500 text-sm mt-1">
              {apporteurs.length} apporteur{apporteurs.length > 1 ? 's' : ''} actif{apporteurs.length > 1 ? 's' : ''}
            </p>
          </div>
          <AddApporteurForm />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {apporteurs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Aucun apporteur pour le moment. Cliquez sur « Ajouter un apporteur » pour commencer.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Commission</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Ajouté le</th>
                </tr>
              </thead>
              <tbody>
                {apporteurs.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {a.commissionType === 'PERCENT' ? `${a.commissionValue} %` : `${a.commissionValue} €`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}