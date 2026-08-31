import { prisma } from '@/lib/prisma'
import Header from '@/app/(mrlead)/dashboard/Header'
import AddInvoiceForm from './AddInvoiceForm'

function symbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

function badgeClass(status: string) {
  if (status === 'PAID') return 'b-paid'
  if (status === 'LATE') return 'b-late'
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-600'
  return 'b-pending'
}

function badgeLabel(status: string) {
  return { PAID: 'Payée', LATE: 'En retard', PENDING: 'En attente', CANCELLED: 'Annulée' }[status] ?? status
}

export default async function InvoicesPage() {
  const [invoices, clients, brands] = await Promise.all([
    prisma.invoice.findMany({
      where: { archived: false },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    }),
    prisma.client.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Factures</h1>
            <p className="text-gray-500 text-sm mt-1">
              {invoices.length} facture{invoices.length > 1 ? 's' : ''} enregistrée{invoices.length > 1 ? 's' : ''}
            </p>
          </div>
          <AddInvoiceForm clients={clients} brands={brands} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Aucune facture pour le moment. Cliquez sur « Nouvelle facture » pour commencer.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">N°</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Destinataire</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Montant</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Échéance</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900">{i.number}</td>
                    <td className="px-4 py-3 text-xs">
                      {i.clientId ? (
                        <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold">À émettre</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold">À payer</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{i.client?.name ?? i.brand?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 num">{i.amount.toFixed(2)} {symbol(i.currency)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{new Date(i.dueDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badgeClass(i.status)}`}>
                        <span className="b-dot" />
                        {badgeLabel(i.status)}
                      </span>
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