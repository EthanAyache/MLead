import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SITES_DOMAIN } from '@/lib/generatedSite'
import Header from '@/app/(mrlead)/dashboard/Header'
import SiteCatalog from './SiteCatalog'

export const dynamic = 'force-dynamic'

// Catalogue des thèmes et périodes que les clients peuvent choisir pour créer leur site.
export default async function AdminSitesPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  if (me.role !== 'ADMIN') redirect('/dashboard')

  const [themes, periods] = await Promise.all([
    prisma.siteTheme.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { sites: true } } },
    }),
    prisma.sitePeriod.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { sites: true } } },
    }),
  ])

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />
      <main className="mx-auto max-w-[1100px] px-[22px] py-[22px]">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        <h1 className="font-bricolage text-[27px] font-bold tracking-tight text-[#16171D]">Sites clients</h1>
        <p className="mt-1 max-w-[640px] text-sm text-[#787C8A]">
          Ce que le client voit dans « Créer mon site ». L&apos;adresse d&apos;un site se compose ainsi :
          <span className="font-mono"> thème-nom-période.{SITES_DOMAIN}</span>
        </p>

        <div className="mt-6">
          <SiteCatalog
            themes={themes.map((t) => ({
              id: t.id, name: t.name, slug: t.slug, defaultUnitPrice: t.defaultUnitPrice,
              department: t.department, active: t.active, position: t.position, sitesCount: t._count.sites,
            }))}
            periods={periods.map((p) => ({
              id: p.id, name: p.name, slug: p.slug, active: p.active, position: p.position, sitesCount: p._count.sites,
            }))}
          />
        </div>
      </main>
    </div>
  )
}
