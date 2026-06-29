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

  const [unpaidCount, clientsCount, historyCount, apporteursCount, aAppelerCount, clients, apporteurs, invoicesAll, archivedAll] = await Promise.all([
    prisma.invoice.count({ where: { archived: false, status: { in: ['PENDING', 'LATE'] }, ...filter } }),
    prisma.client.count({ where: { archived: false, ...filter } }),
    prisma.invoice.count({ where: { archived: false, status: 'PAID', ...filter } }),
    prisma.apporteur.count({ where: { archived: false, ...filter } }),
    prisma.inboundLead.count({ where: { assignedToJboost: true, status: { not: 'REJECTED' }, dossier: { campagne: { client: filter } } } }),
    prisma.client.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.apporteur.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.invoice.findMany({
      where: { archived: false, ...filter },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        apporteur: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { archived: true, ...filter },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        apporteur: { select: { id: true, name: true } },
      },
    }),
  ])

  // Nom affiché pour un côté de la facture (Mr.Lead = interne, sans FK).
  type InvoiceParties = {
    client: { name: string } | null
    brand: { name: string } | null
    apporteur: { name: string } | null
  }
  const partyName = (type: string, inv: InvoiceParties) => {
    if (type === 'MRLEAD') return 'Mr.Lead'
    if (type === 'CLIENT') return inv.client?.name ?? '—'
    if (type === 'BRAND') return inv.brand?.name ?? '—'
    if (type === 'APPORTEUR') return inv.apporteur?.name ?? '—'
    return '—'
  }

  const invoices = invoicesAll.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    debtorName: partyName(i.debtorType, i),
    creditorName: partyName(i.creditorType, i),
  }))

  const archivedInvoices = archivedAll.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    debtorName: partyName(i.debtorType, i),
    creditorName: partyName(i.creditorType, i),
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

  const apporteurRows = await Promise.all(apporteurs.map(async a => ({
    id: a.id, name: a.name, email: a.email,
    commissionType: a.commissionType, commissionValue: a.commissionValue,
    clientCount: await prisma.client.count({ where: { apporteurId: a.id, archived: false, ...filter } }),
  })))

  const counts = {
    factures: unpaidCount,
    clients: clientsCount,
    historique: historyCount,
    apporteurs: apporteursCount,
  }

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
                : 'Suivez qui doit quoi à qui : factures dues par vos clients et sommes dues à vos apporteurs.'}
            </p>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
            {showArchives ? (
              <Link href="/dashboard" className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2">
                ← Retour au dashboard
              </Link>
            ) : (
              <>
                <Link href="/a-appeler" className={`h-[42px] px-4 rounded-[11px] font-semibold text-sm transition flex items-center gap-2 ${aAppelerCount > 0 ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_6px_16px_rgba(124,58,237,.3)]' : 'bg-white border border-[#DCDDE6] text-[#16171D] hover:bg-[#FAFAFC]'}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  À appeler
                  {aAppelerCount > 0 && <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white/25 text-white text-xs font-bold">{aAppelerCount}</span>}
                </Link>
                <Link href="/leads-recus" className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" />
                  </svg>
                  Tous les leads
                </Link>
                <Link href="/themes" className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Thèmes &amp; stock
                </Link>
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
          clients={clientOptions}
          apporteurs={apporteurOptions}
          invoices={invoices}
          clientRows={clientRows}
          apporteurRows={apporteurRows}
          paidInvoices={paidInvoices}
          archivedInvoices={archivedInvoices}
          showArchives={showArchives}
        />
      </main>
    </div>
  )
}