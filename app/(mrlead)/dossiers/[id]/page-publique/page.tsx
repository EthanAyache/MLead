import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { parsePhotos, siteUrl } from '@/lib/generatedSite'
import Header from '@/app/(mrlead)/dashboard/Header'
import SiteEditor from '@/app/(mrlead)/components/SiteEditor'

export const dynamic = 'force-dynamic'

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : ''
}

// Édition de la page publique d'un site par l'équipe Mr.Lead (même éditeur que le portail client).
export default async function AdminSitePagePublique({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, campagne: { client: visibilityFilter(me) } },
    select: {
      id: true, name: true, archived: true,
      campagne: { select: { name: true, client: { select: { name: true } } } },
      generatedSite: { include: { theme: { select: { name: true } }, period: { select: { name: true } } } },
    },
  })
  if (!dossier?.generatedSite) notFound()

  const site = dossier.generatedSite

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/dossiers/${dossier.id}`} className="text-sm font-semibold text-blue-700 hover:underline">
          ← Retour au site
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">Page publique — {dossier.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {dossier.campagne.client.name} · {dossier.campagne.name} · {site.theme.name} — {site.period.name}
        </p>

        {dossier.archived && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Site arrêté : la page publique renvoie une erreur aux visiteurs.
          </div>
        )}

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
      </main>
    </>
  )
}
