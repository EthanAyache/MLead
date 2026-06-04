import { prisma } from '@/lib/prisma'
import Header from '@/app/dashboard/Header'
import AddLeadForm from './AddLeadForm'

function currencySymbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

export default async function LeadsPage() {
  const [leads, brands, clients] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { date: 'desc' },
      include: {
        brand: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.brand.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const totalLeads = leads.length
  const totalRevenue = leads.filter(l => l.sellCurrency === 'EUR').reduce((sum, l) => sum + l.sellPrice, 0)
  const totalCost = leads.filter(l => l.buyCurrency === 'EUR').reduce((sum, l) => sum + l.buyPrice, 0)
  const totalMargin = totalRevenue - totalCost

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 text-sm mt-1">{totalLeads} lead{totalLeads > 1 ? 's' : ''} enregistré{totalLeads > 1 ? 's' : ''}</p>
          </div>
          <AddLeadForm brands={brands} clients={clients} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase">Chiffre d'affaires (€)</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalRevenue.toFixed(2)} €</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase">Coût brands (€)</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalCost.toFixed(2)} €</div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="text-xs font-semibold text-blue-700 uppercase">Marge brute (€)</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{totalMargin.toFixed(2)} €</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {leads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Aucun lead pour le moment. Cliquez sur « Nouveau lead » pour commencer.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Brand</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Libellé</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Achat</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Vente</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Marge</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const sameCurrency = l.buyCurrency === l.sellCurrency
                  const margin = sameCurrency ? l.sellPrice - l.buyPrice : null
                  return (
                    <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-600 text-xs">{new Date(l.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-gray-900">{l.brand.name}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{l.client.name}</td>
                      <td className="px-4 py-3 text-gray-600">{l.label ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">-{l.buyPrice.toFixed(2)} {currencySymbol(l.buyCurrency)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">+{l.sellPrice.toFixed(2)} {currencySymbol(l.sellCurrency)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        {margin !== null ? `${margin.toFixed(2)} ${currencySymbol(l.buyCurrency)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </main>
    </>
  )
}