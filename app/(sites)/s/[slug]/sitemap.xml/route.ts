import { prisma } from '@/lib/prisma'
import { siteUrl } from '@/lib/generatedSite'

export const dynamic = 'force-dynamic'

// Plan du site : une seule adresse, mais c'est elle qui permet à Google de découvrir le
// sous-domaine (rien d'autre ne pointe vers lui) et de savoir quand la page a changé.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await prisma.generatedSite.findFirst({
    where: { slug, dossier: { active: true, archived: false } },
    select: { slug: true, updatedAt: true },
  })
  if (!site) return new Response('Not found', { status: 404 })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl(site.slug)}/</loc>
    <lastmod>${site.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
