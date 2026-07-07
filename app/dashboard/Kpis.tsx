import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

function fmtEUR(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Ce que le client doit pour une offre prise = commission (% du prix de vente, ou montant fixe).
function owedForOffer(o: { commissionType: string; commissionValue: number; sellPrice: number }) {
  return o.commissionType === 'FIXED' ? o.commissionValue : (o.sellPrice * o.commissionValue) / 100
}

export default async function Kpis() {
  const me = await getCurrentUser()
  const filter = visibilityFilter(me)
  const leadFilter = { dossier: { campagne: { client: filter } } }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [monthLeads, aAppeler, unbilled, jboostLeads] = await Promise.all([
    // Leads du mois en cours (pour les compteurs reçus / valides / pris)
    prisma.inboundLead.findMany({
      where: { receivedAt: { gte: startOfMonth }, ...leadFilter },
      include: { chosenOffers: { select: { id: true } } },
    }),
    prisma.inboundLead.count({ where: { assignedToJboost: true, status: { not: 'REJECTED' }, ...leadFilter } }),
    // Pay-per-lead PAS encore facturé (tout, pas juste ce mois) : exactement ce que « Lancer la facturation » facturera.
    // On exclut les clients en prépayé (déjà payés d'avance, jamais facturés au mois).
    prisma.inboundLead.findMany({
      where: {
        status: 'VALID', assignedToJboost: false, monthlyInvoiceId: null, stopInvoiceId: null,
        dossier: { campagne: { client: { ...filter, billingMode: 'MONTHLY' } } },
      },
      include: { dossier: { select: { unitPrice: true } } },
    }),
    // Commissions dues (leads JBoost avec offres prises), tout confondu
    prisma.inboundLead.findMany({
      where: { assignedToJboost: true, ...leadFilter },
      include: { chosenOffers: { select: { commissionType: true, commissionValue: true, sellPrice: true } } },
    }),
  ])

  const received = monthLeads.length
  const valid = monthLeads.filter((l) => l.status === 'VALID').length
  const pris = monthLeads.filter((l) => l.chosenOffers.length > 0).length

  // Argent dû par les clients = pay-per-lead PAS encore facturé (tout, pas juste ce mois, mêmes
  // critères que « Lancer la facturation ») + commissions des offres prises (leads JBoost).
  const duePerLead = unbilled.reduce((s, l) => s + l.dossier.unitPrice, 0)
  const dueCommission = jboostLeads.reduce((s, l) => s + l.chosenOffers.reduce((a, o) => a + owedForOffer(o), 0), 0)
  const totalDue = duePerLead + dueCommission

  const kpis: {
    label: string; value: string; valueClass?: string; sub: React.ReactNode;
    iconBg: string; iconColor: string; icon: React.ReactNode;
  }[] = [
    {
      label: 'Leads reçus', value: received.toLocaleString('fr-FR'),
      sub: <>ce mois-ci</>,
      iconBg: 'bg-[#E3EEFD]', iconColor: 'text-[#2563EB]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" /></svg>,
    },
    {
      label: 'Valides', value: valid.toLocaleString('fr-FR'),
      sub: <>exploitables ce mois</>,
      iconBg: 'bg-[#E6F5ED]', iconColor: 'text-[#1F8A53]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>,
    },
    {
      label: 'À appeler', value: aAppeler.toLocaleString('fr-FR'),
      sub: <>à rappeler par JBoost</>,
      iconBg: 'bg-[#EFEBFD]', iconColor: 'text-[#6A4FE6]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" /></svg>,
    },
    {
      label: 'Pris', value: pris.toLocaleString('fr-FR'),
      sub: <>leads convertis ce mois</>,
      iconBg: 'bg-[#E6F5ED]', iconColor: 'text-[#1F8A53]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /><circle cx="12" cy="12" r="10" /></svg>,
    },
    {
      label: 'Dû par les clients', value: fmtEUR(totalDue),
      sub: <><span className="num">{fmtEUR(duePerLead)}</span> par lead · <span className="num">{fmtEUR(dueCommission)}</span> commission</>,
      iconBg: 'bg-[#FBF0DE]', iconColor: 'text-[#B26A00]',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
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
