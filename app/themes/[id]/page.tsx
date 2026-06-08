import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/app/dashboard/Header'
import ProspectManager from './ProspectManager'

function currencySymbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

export default async function ThemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const theme = await prisma.theme.findUnique({
    where: { id },
    include: {
      tiers: { orderBy: { minQty: 'asc' } },
      prospects: {
        orderBy: { createdAt: 'desc' },
        include: { buyerBrand: { select: { name: true } } },
      },
    },
  })

  if (!theme || theme.archived) notFound()

  const sym = currencySymbol(theme.currency)
  const available = theme.prospects.filter((p) => p.status === 'AVAILABLE')
  const sold = theme.prospects.filter((p) => p.status === 'SOLD')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/themes" className="text-sm text-blue-600 hover:text-blue-700 font-medium">← Tous les thèmes</Link>

          <div className="flex items-start justify-between gap-4 mt-2 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{theme.name}</h1>
              {theme.description && <p className="text-gray-500 text-sm mt-1 max-w-2xl">{theme.description}</p>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{theme.pricePerLead.toFixed(2)} {sym}</div>
              <div className="text-xs text-gray-400">prix de base / lead</div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">En stock</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{available.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Vendus</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{sold.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase">Valeur du stock</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{(available.length * theme.pricePerLead).toFixed(2)} {sym}</div>
            </div>
          </div>

          {/* Paliers de remise */}
          {theme.tiers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Paliers de remise</div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-700">
                  1+ lead : <strong className="ml-1">{theme.pricePerLead.toFixed(2)} {sym}</strong>
                </span>
                {theme.tiers.map((t) => (
                  <span key={t.id} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-700">
                    {t.minQty}+ leads : <strong className="ml-1">{t.pricePerLead.toFixed(2)} {sym}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <ProspectManager themeId={theme.id} />

          {/* Stock */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
            {theme.prospects.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Aucun lead dans ce thème. Ajoutez-en manuellement ou importez un fichier CSV.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Détails</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {theme.prospects.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={p.details ?? ''}>{p.details ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.status === 'SOLD' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Vendu{p.buyerBrand ? ` · ${p.buyerBrand.name}` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            En stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
