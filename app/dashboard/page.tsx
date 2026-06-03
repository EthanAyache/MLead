export const revalidate = 30

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from './Header'
import Kpis from './Kpis'
import DashboardTabs from './DashboardTabs'
import AddInvoiceButton from './AddInvoiceButton'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ archives?: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const params = await searchParams
  const showArchives = params.archives === '1'
  const filter = visibilityFilter(me)

  const [unpaidCount, clientsCount, historyCount, brandsCount, apporteursCount, brands, clients, apporteurs, invoicesAll, archivedAll] = await Promise.all([
    prisma.invoice.count({ where: { archived: false, status: { in: ['PENDING', 'LATE'] }, ...filter } }),
    prisma.client.count({ where: { archived: false, ...filter } }),
    prisma.invoice.count({ where: { archived: false, status: 'PAID', ...filter } }),
    prisma.brand.count({ where: { archived: false, ...filter } }),
    prisma.apporteur.count({ where: { archived: false, ...filter } }),
    prisma.brand.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.apporteur.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.invoice.findMany({
      where: { archived: false, ...filter },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { archived: true, ...filter },
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

  const archivedInvoices = archivedAll.map(i => ({
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
    clientCount: await prisma.client.count({ where: { apporteurId: a.id, archived: false, ...filter } }),
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
              {showArchives ? 'Archives' : 'Soldes & Créances'}
            </h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[560px]">
              {showArchives
                ? 'Factures archivées. Cliquez sur « Restaurer » pour remettre une facture active.'
                : 'Suivez qui doit quoi à qui : factures dues par vos clients, sommes dues à vos brands et apporteurs.'}
            </p>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
            {showArchives ? (
              <Link href="/dashboard" className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2">
                ← Retour au dashboard
              </Link>
            ) : (
              <>
                <Link href="/dashboard?archives=1" className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 8v13H3V8M1 3h22v5H1z" />
                  </svg>
                  Archives {archivedAll.length > 0 && `(${archivedAll.length})`}
                </Link>
                <AddInvoiceButton />
              </>
            )}
          </div>
        </div>

        {!showArchives && <Kpis />}

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
          archivedInvoices={archivedInvoices}
          showArchives={showArchives}
        />
      </main>
    </div>
  )
}