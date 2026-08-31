import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Header from '@/app/(mrlead)/dashboard/Header'
import ThemeForm from './ThemeForm'

function currencySymbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

export default async function ThemesPage() {
  const [themes, counts] = await Promise.all([
    prisma.theme.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'desc' },
      include: { tiers: { orderBy: { minQty: 'asc' } } },
    }),
    prisma.prospect.groupBy({
      by: ['themeId', 'status'],
      _count: { _all: true },
    }),
  ])

  // Map themeId -> { available, sold }
  const stock = new Map<string, { available: number; sold: number }>()
  for (const c of counts) {
    const cur = stock.get(c.themeId) ?? { available: 0, sold: 0 }
    if (c.status === 'SOLD') cur.sold += c._count._all
    else cur.available += c._count._all
    stock.set(c.themeId, cur)
  }

  const totalAvailable = [...stock.values()].reduce((s, v) => s + v.available, 0)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thèmes & stock</h1>
              <p className="text-gray-500 text-sm mt-1">
                {themes.length} thème{themes.length > 1 ? 's' : ''} · {totalAvailable} lead{totalAvailable > 1 ? 's' : ''} en stock
              </p>
            </div>
            <ThemeForm />
          </div>

          {themes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              Aucun thème pour le moment. Cliquez sur « Nouveau thème » pour créer votre première catégorie de leads.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((t) => {
                const s = stock.get(t.id) ?? { available: 0, sold: 0 }
                const sym = currencySymbol(t.currency)
                return (
                  <Link
                    key={t.id}
                    href={`/themes/${t.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{t.name}</h2>
                      <span className="text-blue-700 font-bold whitespace-nowrap">
                        {t.pricePerLead.toFixed(2)} {sym}<span className="text-xs font-normal text-gray-400">/lead</span>
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        {s.available} en stock
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        {s.sold} vendu{s.sold > 1 ? 's' : ''}
                      </span>
                      {t.tiers.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {t.tiers.length} palier{t.tiers.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
