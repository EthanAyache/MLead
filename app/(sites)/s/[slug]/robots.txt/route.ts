import { prisma } from '@/lib/prisma'
import { siteUrl } from '@/lib/generatedSite'

export const dynamic = 'force-dynamic'

// robots.txt de chaque site client. Sans lui, Cloudflare sert son propre fichier par défaut et
// aucun plan de site n'est annoncé aux moteurs.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await prisma.generatedSite.findFirst({
    where: { slug, dossier: { active: true, archived: false } },
    select: { slug: true },
  })

  // Site arrêté ou inexistant : on demande aux moteurs de ne rien indexer.
  const corps = site
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl(site.slug)}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n'

  return new Response(corps, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
