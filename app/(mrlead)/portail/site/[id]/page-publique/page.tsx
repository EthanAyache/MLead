import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { parsePhotos, siteUrl } from '@/lib/generatedSite'
import PortalHeader from '../../../PortalHeader'
import SiteEditor from '@/app/(mrlead)/components/SiteEditor'

export const dynamic = 'force-dynamic'

// Format attendu par <input type="date"> : AAAA-MM-JJ.
function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : ''
}

export default async function PortalSitePagePublique({ params }: { params: Promise<{ id: string }> }) {
  const client = await getPortalClient()
  if (!client) redirect('/login')

  const { id } = await params
  // Isolation : le site doit appartenir à une campagne de ce client.
  const dossier = await prisma.dossier.findFirst({
    where: { id, campagne: { clientId: client.id } },
    select: {
      id: true, name: true, archived: true,
      generatedSite: { include: { theme: { select: { name: true } }, period: { select: { name: true } } } },
    },
  })
  if (!dossier) redirect('/portail')

  const site = dossier.generatedSite
  // Site créé à la main par l'équipe (sans page générée) : rien à éditer ici.
  if (!site) redirect(`/portail/site/${dossier.id}`)

  return (
    <>
      <PortalHeader clientName={client.name} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/portail/site/${dossier.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6A4FE6] hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour au site
        </Link>

        <h1 className="mt-3 font-bricolage text-2xl font-bold tracking-tight">Ma page publique</h1>
        <p className="mt-1 text-sm text-[#787C8A]">
          {site.theme.name} · {site.period.name} — vos modifications sont visibles dès l&apos;enregistrement.
        </p>

        {dossier.archived && (
          <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-semibold text-[#B91C1C]">
            Ce site est arrêté : la page publique n&apos;est plus accessible aux visiteurs.
          </div>
        )}

        {!site.clientCanEdit ? (
          <div className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-5">
            <p className="text-sm font-semibold text-[#16171D]">Cette page est gérée par notre équipe.</p>
            <p className="mt-1 text-sm text-[#787C8A]">
              Pour toute modification, contactez-nous : nous l&apos;appliquons pour vous.
            </p>
            <a href={siteUrl(site.slug)} target="_blank" rel="noopener noreferrer"
               className="mt-4 inline-flex rounded-xl border border-[#E8E9EF] bg-white px-4 py-2 text-sm font-semibold text-[#414350] transition hover:border-[#6A4FE6] hover:text-[#6A4FE6]">
              Voir ma page publique
            </a>
          </div>
        ) : (
        <div className="mt-6">
          <SiteEditor
            siteId={site.id}
            publicUrl={siteUrl(site.slug)}
            initial={{
              brandName: site.brandName,
              offerTitle: site.offerTitle ?? '',
              startDate: toDateInput(site.startDate),
              endDate: toDateInput(site.endDate),
              presentationHtml: site.presentationHtml ?? '',
              photos: parsePhotos(site.photos),
            }}
          />
        </div>
        )}
      </main>
    </>
  )
}
