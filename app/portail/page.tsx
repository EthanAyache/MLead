import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { formatEuros } from '@/lib/tva'
import { parseRecipients } from '@/lib/mail'
import PortalHeader from './PortalHeader'
import SwitchToMonthly from './SwitchToMonthly'
import LeadEmailForm from './LeadEmailForm'

export const dynamic = 'force-dynamic'

export default async function PortalDashboard() {
  const client = await getPortalClient()
  if (!client) redirect('/portail/login')

  const isPrepaid = client.billingMode === 'PREPAID'

  const [priceAgg, recent, sites, leadCounts, unpaidMonthly] = await Promise.all([
    prisma.dossier.aggregate({ _avg: { unitPrice: true }, where: { campagne: { clientId: client.id }, unitPrice: { gt: 0 } } }),
    prisma.inboundLead.findMany({
      where: { status: 'VALID', forwardedToClient: true, assignedToJboost: false, dossier: { campagne: { clientId: client.id } } },
      orderBy: { receivedAt: 'desc' },
      take: 8,
      select: { id: true, name: true, receivedAt: true, dossier: { select: { name: true } } },
    }),
    prisma.dossier.findMany({
      where: { campagne: { clientId: client.id } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unitPrice: true, campagne: { select: { name: true } } },
    }),
    prisma.inboundLead.groupBy({
      by: ['dossierId'],
      where: { status: 'VALID', dossier: { campagne: { clientId: client.id } } },
      _count: { _all: true },
    }),
    isPrepaid ? Promise.resolve(null) : prisma.monthlyInvoice.findFirst({
      where: { clientId: client.id, status: { in: ['SENT', 'FAILED'] } },
      select: { id: true },
    }),
  ])

  const avgPrice = priceAgg._avg.unitPrice ?? 0
  const leadsLeft = isPrepaid && avgPrice > 0 ? Math.floor(client.prepaidBalance / avgPrice) : null
  const depleted = isPrepaid && (client.prepaidBalance <= 0 || (avgPrice > 0 && client.prepaidBalance < avgPrice))
  const needsRegularisation = !isPrepaid && unpaidMonthly !== null
  const countByDossier = new Map(leadCounts.map((c) => [c.dossierId, c._count._all]))
  const currentLeadEmail = parseRecipients(client.notifyEmails)[0] ?? client.email ?? ''

  return (
    <>
      <PortalHeader clientName={client.name} />

      {/* Bandeau d'alerte en haut */}
      {(needsRegularisation || depleted) && (
        <div className="border-b border-[#FECACA] bg-[#FEF2F2]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <p className="text-sm font-semibold text-[#B91C1C]">
              {needsRegularisation
                ? 'Compte à régulariser — une facture est en attente de paiement. Réglez-la pour continuer à recevoir vos leads.'
                : 'Solde épuisé — vous ne recevez plus de leads. Rechargez votre solde pour reprendre.'}
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-bricolage text-2xl font-bold tracking-tight">Bonjour {client.name}</h1>
        <p className="mt-1 text-sm text-[#787C8A]">Voici l&apos;état de votre compte, vos sites et vos derniers leads.</p>

        {/* Carte principale : solde (prépayé) ou formule mensuelle */}
        {isPrepaid ? (
          <section className="mt-6 rounded-2xl border border-[#E4DEFB] bg-[#F4F1FE] p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#6A4FE6]">Votre solde</div>
            <div className="mt-1 font-bricolage text-4xl font-extrabold tracking-tight text-[#2E1F6B]">{formatEuros(client.prepaidBalance)}</div>
            <div className="mt-1 text-sm text-[#6A4FE6]">
              {leadsLeft !== null ? `≈ ${leadsLeft} lead${leadsLeft > 1 ? 's' : ''} restant${leadsLeft > 1 ? 's' : ''}` : 'aucun site payant configuré'}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/portail/recharge" className="flex h-11 items-center justify-center rounded-xl bg-[#059669] px-5 font-semibold text-white transition hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2">
                Recharger mon solde
              </Link>
              <SwitchToMonthly />
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#787C8A]">Formule mensuelle</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[#414350]">Vous êtes facturé <strong>chaque mois</strong> selon le nombre de leads reçus. Aucune avance à faire.</p>
            <p className="mt-1 text-sm text-[#787C8A]">Vous préférez payer d&apos;avance et maîtriser votre budget ? Achetez un pack de leads.</p>
            <Link href="/portail/recharge" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#6A4FE6] px-5 font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] focus:ring-offset-2">
              Acheter un pack de leads
            </Link>
          </section>
        )}

        {/* Mes sites */}
        <section className="mt-6">
          <h2 className="font-bricolage text-lg font-bold">Vos sites</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            {sites.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#787C8A]">Aucun site configuré pour le moment.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#EEF0F5] bg-[#FAFAFC]">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold text-[#787C8A]">Site</th>
                      <th className="px-5 py-3 text-right font-semibold text-[#787C8A]">Prix / lead</th>
                      <th className="px-5 py-3 text-right font-semibold text-[#787C8A]">Leads reçus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr key={s.id} className="border-b border-[#EEF0F5] last:border-0">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-[#16171D]">{s.name}</div>
                          <div className="text-xs text-[#9AA0AE]">{s.campagne.name}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-[#414350]">{s.unitPrice.toFixed(2)} € HT</td>
                        <td className="px-5 py-3 text-right font-semibold text-[#16171D]">{countByDossier.get(s.id) ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* E-mail de réception des leads */}
        <section className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-6">
          <h2 className="font-bricolage text-lg font-bold">E-mail de réception des leads</h2>
          <p className="mt-1 text-sm text-[#787C8A]">L&apos;adresse à laquelle chaque lead vous est transmis dès sa réception.</p>
          <div className="mt-3"><LeadEmailForm current={currentLeadEmail} /></div>
        </section>

        {/* Derniers leads reçus */}
        <section className="mt-6">
          <h2 className="font-bricolage text-lg font-bold">Derniers leads reçus</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#787C8A]">Aucun lead reçu pour l&apos;instant. Vos prochains leads apparaîtront ici.</div>
            ) : (
              <ul className="divide-y divide-[#EEF0F5]">
                {recent.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#16171D]">{l.name || 'Lead sans nom'}</div>
                      <div className="truncate text-xs text-[#787C8A]">{l.dossier.name}</div>
                    </div>
                    <time className="shrink-0 text-xs text-[#9AA0AE]" dateTime={l.receivedAt.toISOString()}>
                      {l.receivedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-2 text-xs text-[#9AA0AE]">Le détail complet de chaque lead vous est envoyé par e-mail au moment de sa réception.</p>
        </section>
      </main>
    </>
  )
}
