import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { formatEuros } from '@/lib/tva'
import PortalHeader from './PortalHeader'
import SwitchToMonthly from './SwitchToMonthly'

export const dynamic = 'force-dynamic'

export default async function PortalDashboard() {
  const client = await getPortalClient()
  if (!client) redirect('/portail/login')

  const isPrepaid = client.billingMode === 'PREPAID'

  const [priceAgg, recent] = await Promise.all([
    prisma.dossier.aggregate({ _avg: { unitPrice: true }, where: { campagne: { clientId: client.id }, unitPrice: { gt: 0 } } }),
    prisma.inboundLead.findMany({
      where: { status: 'VALID', forwardedToClient: true, assignedToJboost: false, dossier: { campagne: { clientId: client.id } } },
      orderBy: { receivedAt: 'desc' },
      take: 8,
      select: { id: true, name: true, receivedAt: true, dossier: { select: { name: true } } },
    }),
  ])
  const avgPrice = priceAgg._avg.unitPrice ?? 0
  const leadsLeft = isPrepaid && avgPrice > 0 ? Math.floor(client.prepaidBalance / avgPrice) : null
  const depleted = isPrepaid && (client.prepaidBalance <= 0 || (avgPrice > 0 && client.prepaidBalance < avgPrice))

  return (
    <>
      <PortalHeader clientName={client.name} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-bricolage text-2xl font-bold tracking-tight">Bonjour {client.name}</h1>
        <p className="mt-1 text-sm text-[#787C8A]">Voici l&apos;état de votre compte et vos derniers leads reçus.</p>

        {/* Carte principale : solde (prépayé) ou formule mensuelle */}
        {isPrepaid ? (
          <section className="mt-6 rounded-2xl border border-[#E4DEFB] bg-[#F4F1FE] p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#6A4FE6]">Votre solde</div>
            <div className="mt-1 font-bricolage text-4xl font-extrabold tracking-tight text-[#2E1F6B]">{formatEuros(client.prepaidBalance)}</div>
            <div className="mt-1 text-sm text-[#6A4FE6]">
              {leadsLeft !== null ? `≈ ${leadsLeft} lead${leadsLeft > 1 ? 's' : ''} restant${leadsLeft > 1 ? 's' : ''}` : 'aucun site payant configuré'}
            </div>

            {depleted && (
              <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                Votre solde est épuisé — vous ne recevez plus de nouveaux leads. Rechargez pour reprendre, ou passez à la facturation mensuelle.
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/portail/recharge"
                className="flex h-11 items-center justify-center rounded-xl bg-[#059669] px-5 font-semibold text-white transition hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2"
              >
                Recharger mon solde
              </Link>
              <SwitchToMonthly />
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#787C8A]">Formule mensuelle</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[#414350]">
              Vous êtes facturé <strong>chaque mois</strong> selon le nombre de leads reçus. Aucune avance à faire.
            </p>
            <p className="mt-1 text-sm text-[#787C8A]">Vous préférez payer d&apos;avance et maîtriser votre budget ? Achetez un pack de leads.</p>
            <Link
              href="/portail/recharge"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#6A4FE6] px-5 font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] focus:ring-offset-2"
            >
              Acheter un pack de leads
            </Link>
          </section>
        )}

        {/* Derniers leads reçus */}
        <section className="mt-6">
          <h2 className="font-bricolage text-lg font-bold">Derniers leads reçus</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#787C8A]">
                Aucun lead reçu pour l&apos;instant. Vos prochains leads apparaîtront ici.
              </div>
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
