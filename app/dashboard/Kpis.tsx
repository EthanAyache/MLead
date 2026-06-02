import { prisma } from '@/lib/prisma'

function fmtEUR(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default async function Kpis() {
  const [invoices, leads, clients] = await Promise.all([
    prisma.invoice.findMany({ where: { archived: false } }),
    prisma.lead.findMany(),
    prisma.client.findMany({ where: { archived: false } }),
  ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const owed = invoices.filter(i => (i.status === 'PENDING' || i.status === 'LATE') && i.currency === 'EUR')
  const totalOwed = owed.reduce((s, i) => s + i.amount, 0)

  const paidNow = invoices.filter(i => i.status === 'PAID' && i.paidAt && i.paidAt >= startOfMonth && i.currency === 'EUR')
  const collected = paidNow.reduce((s, i) => s + i.amount, 0)
  const paidPrev = invoices.filter(i => i.status === 'PAID' && i.paidAt && i.paidAt >= startOfPrev && i.paidAt < startOfMonth && i.currency === 'EUR')
  const collectedPrev = paidPrev.reduce((s, i) => s + i.amount, 0)
  const trend = collectedPrev > 0 ? Math.round(((collected - collectedPrev) / collectedPrev) * 100) : null

  const late = invoices.filter(i => i.status === 'LATE' && i.currency === 'EUR')
  const lateAmount = late.reduce((s, i) => s + i.amount, 0)

  const totalLeads = leads.length
  const leadsThisMonth = leads.filter(l => l.date >= startOfMonth).length

  const totalClients = clients.length
  const clientsWithDebt = new Set(owed.map(i => i.clientId).filter(Boolean)).size
  const clientsOk = totalClients - clientsWithDebt

  const kpis: {
    label: string; value: string; valueClass?: string; sub: React.ReactNode;
    iconBg: string; iconColor: string; icon: React.ReactNode;
  }[] = [
    {
      label: 'Total dû',
      value: fmtEUR(totalOwed),
      sub: <>Sur <span className="num">{owed.length}</span> facture{owed.length > 1 ? 's' : ''} impayée{owed.length > 1 ? 's' : ''}</>,
      iconBg: 'bg-[#FCEAEA]', iconColor: 'text-[#D23B3B]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    },
    {
      label: 'Encaissé ce mois',
      value: fmtEUR(collected),
      sub: trend === null
        ? <span className="text-[#787C8A]">Premier mois suivi</span>
        : <span className={trend >= 0 ? 'text-[#1F8A53] font-semibold' : 'text-[#D23B3B] font-semibold'}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} % vs mois dernier
          </span>,
      iconBg: 'bg-[#E6F5ED]', iconColor: 'text-[#1F8A53]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>,
    },
    {
      label: 'En retard',
      value: fmtEUR(lateAmount),
      valueClass: 'text-[#D23B3B]',
      sub: <><span className="num">{late.length}</span> facture{late.length > 1 ? 's' : ''} à relancer</>,
      iconBg: 'bg-[#FBF0DE]', iconColor: 'text-[#B26A00]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    },
    {
      label: 'Leads vendus',
      value: totalLeads.toLocaleString('fr-FR'),
      sub: <><span className="num">{leadsThisMonth}</span> ce mois-ci</>,
      iconBg: 'bg-[#E3EEFD]', iconColor: 'text-[#2563EB]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
    },
    {
      label: 'Clients actifs',
      value: totalClients.toString(),
      sub: <><span className="num">{clientsOk}</span> à jour de paiement</>,
      iconBg: 'bg-[#EFEBFD]', iconColor: 'text-[#6A4FE6]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-[18px]">
      {kpis.map((k) => (
        <div key={k.label} className="bg-white border border-[#E8E9EF] rounded-[14px] px-[18px] py-4 shadow-[0_1px_2px_rgba(20,22,30,.06)]">
          <div className="flex items-center gap-2 text-[#787C8A] text-[12.5px] font-semibold uppercase tracking-[0.03em]">
            <span className={`w-[26px] h-[26px] rounded-lg ${k.iconBg} ${k.iconColor} flex items-center justify-center`}>{k.icon}</span>
            {k.label}
          </div>
          <div className={`mt-2.5 font-bricolage font-bold text-[25px] tracking-tight num ${k.valueClass ?? 'text-[#16171D]'}`}>
            {k.value}
          </div>
          <div className="text-[12.5px] text-[#787C8A] mt-0.5">{k.sub}</div>
        </div>
      ))}
    </div>
  )
}