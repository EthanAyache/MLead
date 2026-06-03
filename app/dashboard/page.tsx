export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Header from './Header'
import Kpis from './Kpis'
import DashboardTabs from './DashboardTabs'
import AddInvoiceButton from './AddInvoiceButton'

export default async function DashboardPage() {
  const [unpaidCount, clientsCount, historyCount, brandsCount, apporteursCount, brands, clients, apporteurs, invoicesAll] = await Promise.all([
    prisma.invoice.count({ where: { archived: false, status: { in: ['PENDING', 'LATE'] } } }),
    prisma.client.count({ where: { archived: false } }),
    prisma.invoice.count({ where: { status: 'PAID' } }),
    prisma.brand.count({ where: { archived: false } }),
    prisma.apporteur.count({ where: { archived: false } }),
    prisma.brand.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
    prisma.apporteur.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
    prisma.invoice.findMany({
      where: { archived: false },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    }),
  ])

  const invoices = invoicesAll.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
  }))

  const unpaidInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'LATE')
  const paidInvoices = invoices.filter(i => i.status === 'PAID')

  const clientRows = clients.map(c => {
    const inv = unpaidInvoices.filter(i => i.clientId === c.id)
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      totalOwed: inv.reduce((s, i) => s + i.amount, 0),
      invoiceCount: inv.length,
      hasLate: inv.some(i => i.status === 'LATE'),
    }
  })

  const brandRows = brands.map(b => {
    const inv = unpaidInvoices.filter(i => i.brandId === b.id)
    return {
      id: b.id, name: b.name, email: b.email,
      totalOwed: inv.reduce((s, i) => s + i.amount, 0),
      invoiceCount: inv.length,
      hasLate: inv.some(i => i.status === 'LATE'),
    }
  })

  const apporteurRows = await Promise.all(apporteurs.map(async a => ({
    id: a.id, name: a.name, email: a.email,
    commissionType: a.commissionType, commissionValue: a.commissionValue,
    clientCount: await prisma.client.count({ where: { apporteurId: a.id, archived: false } }),
  })))

  const counts = {
    factures: unpaidCount,
    clients: clientsCount,
    historique: historyCount,
    brands: brandsCount,
    apporteurs: apporteursCount,
  }

  const brandOptions = brands.map(b => ({ id: b.id, name: b.name }))
  const clientOptions = clients.map(c => ({ id: c.id, name: c.name }))
  const apporteurOptions = apporteurs.map(a => ({ id: a.id, name: a.name }))

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />

      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        <div className="flex items-start gap-4 flex-wrap mb-[18px] mt-2">
          <div>
            <h1 className="font-bricolage text-[27px] font-bold text-[#16171D] tracking-tight">
              Soldes &amp; Créances
            </h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[560px]">
              Suivez qui doit quoi à qui : factures dues par vos clients, sommes dues à vos brands et apporteurs.
            </p>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
            <button className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition">
              Archives
            </button>
            <AddInvoiceButton />
          </div>
        </div>

        <Kpis />
        <DashboardTabs
          counts={counts}
          brands={brandOptions}
          clients={clientOptions}
          apporteurs={apporteurOptions}
          invoices={invoices}
          clientRows={clientRows}
          brandRows={brandRows}
          apporteurRows={apporteurRows}
          paidInvoices={paidInvoices}
        />
      </main>
    </div>
  )
}