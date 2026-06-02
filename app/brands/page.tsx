import { prisma } from '@/lib/prisma'
import AddBrandForm from './AddBrandForm'

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Brands</h1>
            <p className="text-gray-500 text-sm mt-1">
              {brands.length} brand{brands.length > 1 ? 's' : ''} active{brands.length > 1 ? 's' : ''}
            </p>
          </div>
          <AddBrandForm />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {brands.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Aucune brand pour le moment. Cliquez sur « Ajouter une brand » pour commencer.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Ajoutée le</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{brand.name}</td>
                    <td className="px-4 py-3 text-gray-600">{brand.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{brand.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(brand.createdAt).toLocaleDateString('fr-FR')}
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