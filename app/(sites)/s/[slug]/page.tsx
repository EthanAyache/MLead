import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDateRange, parsePhotos, siteUrl } from '@/lib/generatedSite'
import IconSprite from './IconSprite'
import SiteForm from './SiteForm'
import SiteGallery from './SiteGallery'

// Page publique d'un site client, servie sur <slug>.offreofficielle.fr (réécriture faite dans proxy.ts).
// Le contenu est éditable à tout moment depuis le portail : jamais de cache.
export const dynamic = 'force-dynamic'

// Un site dont le Dossier est arrêté (archivé) ou désactivé ne doit plus rien afficher :
// il ne reçoit plus de leads, la page n'a plus lieu d'être.
async function loadSite(slug: string) {
  return prisma.generatedSite.findFirst({
    where: { slug, dossier: { active: true, archived: false } },
    include: {
      dossier: { select: { token: true } },
      theme: { select: { name: true } },
      period: { select: { name: true } },
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const site = await loadSite(slug)
  if (!site) return { title: 'Page introuvable' }

  const dates = formatDateRange(site.startDate, site.endDate)
  return {
    title: site.offerTitle ? `${site.brandName} — ${site.offerTitle}` : `${site.brandName} — ${site.theme.name}`,
    description: [site.offerTitle ?? site.theme.name, site.period.name, dates].filter(Boolean).join(' · '),
    // La page reste atteignable en interne via /s/<slug> : l'adresse de référence est le sous-domaine.
    alternates: { canonical: siteUrl(site.slug) },
  }
}

export default async function GeneratedSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await loadSite(slug)
  if (!site) notFound()

  const dates = formatDateRange(site.startDate, site.endDate)
  const photos = parsePhotos(site.photos)
  const presentation = site.presentationHtml?.trim()

  return (
    <>
      <IconSprite />

      <main className="phone">
        <header className="hero">
          <div className="hero__inner">
            <h1 className="hero__brand">{site.brandName}</h1>
            <span className="hero__rule" aria-hidden="true"></span>
            <p className="hero__tagline">{site.offerTitle || site.theme.name}</p>
            {dates && (
              <p className="hero__dates">
                <svg className="ic ic--sm" aria-hidden="true"><use href="#i-cal" /></svg>
                {dates}
              </p>
            )}
          </div>
        </header>

        <section className="card card--form" aria-labelledby="t-form">
          <div className="card__head">
            <h2 className="card__title" id="t-form">Rappelez-moi</h2>
            <p className="card__sub">Laissez vos coordonnées, nous vous rappelons sous 24&nbsp;h.</p>
          </div>
          <SiteForm token={site.dossier.token} />
        </section>

        <SiteGallery photos={photos} />

        {presentation && (
          <section className="card card--editor" aria-labelledby="t-edit">
            <div className="card__head card__head--row">
              <h2 className="card__title card__title--sm" id="t-edit">Présentation</h2>
            </div>
            {/* Contenu écrit dans l'éditeur du portail. Assaini à l'enregistrement (lib/generatedSite.ts). */}
            <div className="editor editor--lock" dangerouslySetInnerHTML={{ __html: presentation }} />
          </section>
        )}

        <footer className="foot">
          <p><strong>{site.brandName}</strong>{site.offerTitle ? ` — ${site.offerTitle}` : ''}</p>
          {dates && <p className="foot__sm">{dates}</p>}
        </footer>
      </main>
    </>
  )
}
