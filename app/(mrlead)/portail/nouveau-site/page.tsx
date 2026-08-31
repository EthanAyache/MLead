import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'
import { SITES_DOMAIN } from '@/lib/generatedSite'
import PortalHeader from '../PortalHeader'
import NewSiteForm from './NewSiteForm'

export const dynamic = 'force-dynamic'

export default async function NewSitePage() {
  const client = await getPortalClient()
  if (!client) redirect('/login')

  const [campagnes, themes, periods, locked] = await Promise.all([
    // Une campagne qui a déjà son site n'est plus proposée : un site public par campagne.
    prisma.campagne.findMany({
      where: { clientId: client.id, generatedSite: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.siteTheme.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
    prisma.sitePeriod.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
    hasUnpaidStopInvoice(client.id),
  ])

  const indisponible =
    locked ? "Une facture d'arrêt est en attente de paiement. Réglez-la pour créer un nouveau site."
    : campagnes.length === 0 ? "Toutes vos campagnes ont déjà leur site. Contactez-nous pour en ouvrir une nouvelle."
    : themes.length === 0 || periods.length === 0 ? "Aucun thème n'est disponible pour le moment. Contactez-nous."
    : null

  return (
    <>
      <PortalHeader clientName={client.name} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/portail" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6A4FE6] hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour
        </Link>

        <h1 className="mt-3 font-bricolage text-2xl font-bold tracking-tight">Créer mon site</h1>
        <p className="mt-1 text-sm text-[#787C8A]">
          Votre page en ligne en quelques secondes, avec son formulaire déjà relié à votre compte :
          chaque demande arrive directement dans vos leads.
        </p>

        {indisponible ? (
          <div className="mt-6 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-sm font-semibold text-[#92400E]">
            {indisponible}
          </div>
        ) : (
          <NewSiteForm campagnes={campagnes} themes={themes} periods={periods} sitesDomain={SITES_DOMAIN} />
        )}
      </main>
    </>
  )
}
