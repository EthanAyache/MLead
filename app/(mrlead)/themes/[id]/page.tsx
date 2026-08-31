import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { readFields } from '@/lib/themeFields'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/app/(mrlead)/dashboard/Header'
import ProspectManager from './ProspectManager'
import DeleteThemeButton from './DeleteThemeButton'
import ProspectTable, { type Row } from './ProspectTable'
import ThemeForm, { type ThemeData } from '../ThemeForm'

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

  const user = await getCurrentUser()
  const isAdmin = user?.role === 'ADMIN'
  const sym = currencySymbol(theme.currency)
  const fields = readFields(theme.fields)

  const themeData: ThemeData = {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    pricePerLead: theme.pricePerLead,
    currency: theme.currency,
    tiers: theme.tiers.map((t) => ({ minQty: t.minQty, pricePerLead: t.pricePerLead })),
    fields,
  }
  const available = theme.prospects.filter((p) => p.status === 'AVAILABLE')
  const sold = theme.prospects.filter((p) => p.status === 'SOLD')

  const rows: Row[] = theme.prospects.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    details: p.details,
    status: p.status,
    buyerBrandName: p.buyerBrand?.name ?? null,
    data: (p.data as Record<string, string> | null) ?? {},
  }))

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
            <div className="flex items-center gap-2.5">
              <ThemeForm theme={themeData} />
              {isAdmin && <DeleteThemeButton themeId={theme.id} themeName={theme.name} />}
              <div className="text-right ml-1.5">
                <div className="text-2xl font-bold text-blue-700">{theme.pricePerLead.toFixed(2)} {sym}</div>
                <div className="text-xs text-gray-400">prix de base / lead</div>
              </div>
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

          <ProspectManager themeId={theme.id} fields={fields} />

          {/* Stock */}
          <ProspectTable rows={rows} fields={fields} />
        </div>
      </main>
    </>
  )
}
