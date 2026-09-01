import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { formatEuros } from '@/lib/tva'
import { parseRecipients } from '@/lib/mail'
import PortalHeader from './PortalHeader'
import LeadEmailForm from './LeadEmailForm'
import SitesManager from './SitesManager'

export const dynamic = 'force-dynamic'

export default async function PortalDashboard() {
  const client = await getPortalClient()
  if (!client) redirect('/login')

  const [recent, sites, leadCounts, unpaidMonthly, topupCount, pendingStop, sitesSansPage] = await Promise.all([
    prisma.inboundLead.findMany({
      where: { status: 'VALID', forwardedToClient: true, assignedToJboost: false, dossier: { campagne: { clientId: client.id } } },
      orderBy: { receivedAt: 'desc' },
      take: 8,
      select: { id: true, name: true, email: true, phone: true, receivedAt: true, dossier: { select: { name: true } } },
    }),
    prisma.dossier.findMany({
      where: { campagne: { clientId: client.id } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, unitPrice: true, billingMode: true, archived: true, campagne: { select: { name: true } }, generatedSite: { select: { id: true } } },
    }),
    prisma.inboundLead.groupBy({
      by: ['dossierId'],
      // « Leads reçus » = uniquement ceux réellement transmis au client (pas les leads retenus tant
      // qu'il n'a pas payé, ni ceux rappelés par JBoost).
      where: { status: 'VALID', forwardedToClient: true, assignedToJboost: false, dossier: { campagne: { clientId: client.id } } },
      _count: { _all: true },
    }),
    prisma.monthlyInvoice.findFirst({ where: { clientId: client.id, status: { in: ['SENT', 'FAILED'] } }, select: { id: true } }),
    prisma.prepaidTopup.count({ where: { clientId: client.id, status: { in: ['PAID', 'MANUAL'] } } }),
    // Facture d'arrêt en attente de paiement (verrou du compte).
    prisma.stopInvoice.findFirst({ where: { clientId: client.id, status: { in: ['SENT', 'FAILED'] } }, orderBy: { createdAt: 'desc' }, select: { payUrl: true } }),
    // Un site sans page publique = le client peut encore en créer une (une page par site).
    prisma.dossier.count({ where: { archived: false, campagne: { clientId: client.id }, generatedSite: null } }),
  ])

  const countByDossier = new Map(leadCounts.map((c) => [c.dossierId, c._count._all]))
  const toSiteRow = (s: (typeof sites)[number]) => ({
    id: s.id, name: s.name, campagneName: s.campagne.name, unitPrice: s.unitPrice,
    billingMode: s.billingMode as 'MONTHLY' | 'PREPAID', leadsCount: countByDossier.get(s.id) ?? 0,
    hasPublicPage: s.generatedSite !== null,
  })
  const activeSites = sites.filter((s) => !s.archived).map(toSiteRow)
  const archivedSites = sites.filter((s) => s.archived).map(toSiteRow)

  // Solde partagé + estimation basée sur le prix moyen des sites PRÉPAYÉS.
  const walletBalance = client.prepaidBalance
  const prepaidPaidSites = activeSites.filter((s) => s.billingMode === 'PREPAID' && s.unitPrice > 0)
  const hasPrepaidSite = activeSites.some((s) => s.billingMode === 'PREPAID')
  const avgPrepaidPrice = prepaidPaidSites.length ? prepaidPaidSites.reduce((a, s) => a + s.unitPrice, 0) / prepaidPaidSites.length : 0
  const leadsLeft = avgPrepaidPrice > 0 ? Math.floor(walletBalance / avgPrepaidPrice) : null
  const depleted = hasPrepaidSite && (walletBalance <= 0 || (avgPrepaidPrice > 0 && walletBalance < avgPrepaidPrice))
  const needsRegularisation = unpaidMonthly !== null
  const hasTopup = topupCount > 0
  // Bandeau : régularisation (site mensuel impayé) / solde épuisé (déjà rechargé) / bienvenue (jamais rechargé).
  const banner: 'regularise' | 'depleted' | 'welcome' | null =
    needsRegularisation ? 'regularise' : depleted ? (hasTopup ? 'depleted' : 'welcome') : null
  const currentLeadEmail = parseRecipients(client.notifyEmails)[0] ?? client.email ?? ''

  const stopLocked = pendingStop !== null
  const stopPayUrl = pendingStop?.payUrl ?? null

  return (
    <>
      <PortalHeader clientName={client.name} />

      {/* Bandeau d'état en haut */}
      {banner === 'welcome' ? (
        <div className="border-b border-[#E4DEFB] bg-[#F4F1FE]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6A4FE6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <p className="text-sm font-semibold text-[#5B3FD6]">
              Bienvenue&nbsp;! Vous n&apos;avez pas encore de leads : achetez votre premier pack pour commencer à en recevoir.
            </p>
          </div>
        </div>
      ) : banner ? (
        <div className="border-b border-[#FECACA] bg-[#FEF2F2]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <p className="text-sm font-semibold text-[#B91C1C]">
              {banner === 'regularise'
                ? 'Compte à régulariser — une facture est en attente de paiement. Réglez-la pour continuer à recevoir vos leads.'
                : 'Solde épuisé — vous ne recevez plus de leads. Rechargez votre solde pour reprendre.'}
            </p>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-bricolage text-2xl font-bold tracking-tight">Bonjour {client.name}</h1>
        <p className="mt-1 text-sm text-[#787C8A]">Voici l&apos;état de votre compte, vos sites et vos derniers leads.</p>

        {/* Carte solde prépayé (partagé par tous les sites en formule prépayée) */}
        <section className="mt-6 rounded-2xl border border-[#E4DEFB] bg-[#F4F1FE] p-6">
          <div className="text-sm font-semibold uppercase tracking-wide text-[#6A4FE6]">Votre solde prépayé</div>
          <div className="mt-1 font-bricolage text-4xl font-extrabold tracking-tight text-[#2E1F6B]">{formatEuros(walletBalance)}</div>
          <div className="mt-1 text-sm text-[#6A4FE6]">
            {leadsLeft !== null
              ? `≈ ${leadsLeft} lead${leadsLeft > 1 ? 's' : ''} restant${leadsLeft > 1 ? 's' : ''} sur vos sites prépayés`
              : hasPrepaidSite ? 'utilisé par vos sites en formule prépayée' : 'passez un site en « prépayé » pour utiliser votre solde'}
          </div>
          <div className="mt-5">
            <Link href="/portail/recharge" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#059669] px-5 font-semibold text-white transition hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2">
              Recharger mon solde
            </Link>
          </div>
        </section>

        {/* Mes sites : consultation + arrêt / réactivation */}
        <SitesManager active={activeSites} archived={archivedSites} locked={stopLocked} stopPayUrl={stopPayUrl} canCreateSite={sitesSansPage > 0} />

        {/* E-mail de réception des leads */}
        <section className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-6">
          <h2 className="font-bricolage text-lg font-bold">E-mail de réception des leads</h2>
          <p className="mt-1 text-sm text-[#787C8A]">L&apos;adresse à laquelle chaque lead vous est transmis dès sa réception.</p>
          <div className="mt-3"><LeadEmailForm current={currentLeadEmail} /></div>
        </section>

        {/* Derniers leads reçus */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bricolage text-lg font-bold">Derniers leads reçus</h2>
            <Link href="/portail/leads" className="shrink-0 text-sm font-semibold text-[#6A4FE6] hover:underline">Tous les leads reçus →</Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#787C8A]">Aucun lead reçu pour l&apos;instant. Vos prochains leads apparaîtront ici.</div>
            ) : (
              <ul className="divide-y divide-[#EEF0F5]">
                {recent.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#16171D]">{l.name || 'Lead sans nom'}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                        {l.email && <a href={`mailto:${l.email}`} className="text-[#6A4FE6] hover:underline">{l.email}</a>}
                        {l.phone && <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="text-[#6A4FE6] hover:underline">{l.phone}</a>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#787C8A]">{l.dossier.name}</div>
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
