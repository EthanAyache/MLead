export const revalidate = 30

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from './Header'
import Kpis from './Kpis'
import DashboardTabs from './DashboardTabs'

export default async function DashboardPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const filter = visibilityFilter(me)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [clients, apporteurs, aAppelerCount, monthlyInvoices, monthBillableLeads] = await Promise.all([
    prisma.client.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' }, include: { apporteur: { select: { name: true } } } }),
    prisma.apporteur.findMany({ where: { archived: false, ...filter }, orderBy: { name: 'asc' } }),
    prisma.inboundLead.count({ where: { assignedToJboost: true, status: { not: 'REJECTED' }, dossier: { campagne: { client: filter } } } }),
    prisma.monthlyInvoice.findMany({
      where: { client: { ...filter } },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      include: { client: { select: { id: true, name: true } } },
    }),
    // Leads facturables du mois en cours, avec prix du site + client (pour le CA / les commissions apporteurs).
    prisma.inboundLead.findMany({
      where: { receivedAt: { gte: startOfMonth }, status: 'VALID', assignedToJboost: false, dossier: { campagne: { client: filter } } },
      select: { dossier: { select: { unitPrice: true, campagne: { select: { client: { select: { id: true } } } } } } },
    }),
  ])

  // Factures mensuelles (pay-per-lead)
  const monthlyRows = monthlyInvoices.map((m) => ({
    id: m.id,
    period: m.period,
    clientName: m.client.name,
    leadCount: m.leadCount,
    amount: m.amount,
    status: m.status,
    stripeInvoiceId: m.stripeInvoiceId,
  }))
  const isUnpaid = (s: string) => s === 'SENT' || s === 'FAILED'
  const blockedClientIds = new Set(monthlyInvoices.filter((m) => isUnpaid(m.status)).map((m) => m.clientId))
  const monthlyUnpaid = monthlyInvoices.filter((m) => isUnpaid(m.status)).length

  // CA des leads du mois en cours, par client (nb leads facturables × prix du site)
  const caByClient = new Map<string, number>()
  const leadCountByClient = new Map<string, number>()
  for (const l of monthBillableLeads) {
    const cid = l.dossier.campagne.client.id
    caByClient.set(cid, (caByClient.get(cid) ?? 0) + l.dossier.unitPrice)
    leadCountByClient.set(cid, (leadCountByClient.get(cid) ?? 0) + 1)
  }

  // Clients : solde dû = factures mensuelles impayées (SENT/FAILED)
  const clientRows = clients.map((c) => {
    const unpaid = monthlyInvoices.filter((m) => m.clientId === c.id && isUnpaid(m.status))
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      apporteurName: c.apporteur?.name ?? null,
      totalOwed: unpaid.reduce((s, m) => s + m.amount, 0),
      invoiceCount: unpaid.length,
      hasLate: unpaid.some((m) => m.status === 'FAILED'),
      suspended: blockedClientIds.has(c.id),
    }
  })

  // Apporteurs : commission ce mois = % × CA des leads de leurs clients ce mois
  //              (ou, si l'apporteur est en montant fixe, valeur × nb de leads)
  const apporteurRows = apporteurs.map((a) => {
    const myClients = clients.filter((c) => c.apporteurId === a.id)
    const leadCA = myClients.reduce((s, c) => s + (caByClient.get(c.id) ?? 0), 0)
    const leadCount = myClients.reduce((s, c) => s + (leadCountByClient.get(c.id) ?? 0), 0)
    const activeClients = myClients.filter((c) => (leadCountByClient.get(c.id) ?? 0) > 0).length
    const commission = a.commissionType === 'PERCENT' ? (leadCA * a.commissionValue) / 100 : a.commissionValue * leadCount
    return {
      id: a.id, name: a.name, email: a.email,
      commissionType: a.commissionType, commissionValue: a.commissionValue,
      clientCount: myClients.length, activeClients, leadCA, commission,
    }
  })

  const counts = {
    facturation: monthlyUnpaid,
    clients: clients.length,
    apporteurs: apporteurs.length,
  }

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />

      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        <div className="flex items-start gap-4 flex-wrap mb-[18px] mt-2">
          <div>
            <h1 className="font-bricolage text-[27px] font-bold text-[#16171D] tracking-tight">Tableau de bord</h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[560px]">
              Suivez vos leads, la facturation mensuelle de vos clients et les commissions de vos apporteurs.
            </p>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
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
          </div>
        </div>

        <Kpis />

        <DashboardTabs
          counts={counts}
          clientRows={clientRows}
          apporteurRows={apporteurRows}
          monthlyRows={monthlyRows}
          isAdmin={me.role === 'ADMIN'}
        />
      </main>
    </div>
  )
}
