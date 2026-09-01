import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SITES_DOMAIN, siteUrl } from '@/lib/generatedSite'
import Header from '@/app/(mrlead)/dashboard/Header'
import SiteCatalog from './SiteCatalog'

export const dynamic = 'force-dynamic'

// Catalogue des thèmes et périodes que les clients peuvent choisir pour créer leur site.
export default async function AdminSitesPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  if (me.role !== 'ADMIN') redirect('/dashboard')

  const [themes, periods, sites] = await Promise.all([
    prisma.siteTheme.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { sites: true } } },
    }),
    prisma.sitePeriod.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { sites: true } } },
    }),
    // Les sites publics déjà créés par les clients.
    prisma.generatedSite.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, brandName: true, createdAt: true,
        theme: { select: { name: true } },
        period: { select: { name: true } },
        dossier: {
          select: {
            id: true, archived: true, unitPrice: true,
            campagne: { select: { name: true, client: { select: { name: true } } } },
            _count: { select: { leads: true } },
          },
        },
      },
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

        {/* Sites publics déjà créés par les clients */}
        <section className="mt-6 rounded-2xl border border-[#E8E9EF] bg-white p-5">
          <h2 className="font-bricolage text-lg font-bold">Sites en ligne ({sites.length})</h2>
          <p className="mt-1 text-sm text-[#787C8A]">
            Créés par les clients depuis leur portail. « Modifier » ouvre l&apos;éditeur de la page publique.
          </p>

          {sites.length === 0 ? (
            <p className="mt-4 text-sm text-[#787C8A]">Aucun site créé pour le moment.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[#9AA0AE]">
                    <th className="py-2">Client</th>
                    <th className="py-2">Offre</th>
                    <th className="py-2">Adresse</th>
                    <th className="py-2">€ HT / lead</th>
                    <th className="py-2">Leads</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0F5]">
                  {sites.map((s) => (
                    <tr key={s.id} className={s.dossier.archived ? 'text-[#9AA0AE]' : ''}>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-[#16171D]">{s.dossier.campagne.client.name}</div>
                        <div className="text-xs text-[#9AA0AE]">{s.dossier.campagne.name}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {s.brandName}
                        <div className="text-xs text-[#9AA0AE]">{s.theme.name} · {s.period.name}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <a href={siteUrl(s.slug)} target="_blank" rel="noopener noreferrer"
                           className="font-mono text-xs text-[#6A4FE6] hover:underline">
                          {s.slug}.{SITES_DOMAIN}
                        </a>
                        {s.dossier.archived && <span className="ml-2 text-xs font-semibold text-[#B91C1C]">arrêté</span>}
                      </td>
                      <td className="py-2 pr-3">{s.dossier.unitPrice.toFixed(2)} €</td>
                      <td className="py-2 pr-3">{s.dossier._count.leads}</td>
                      <td className="py-2 text-right">
                        <Link href={`/dossiers/${s.dossier.id}/page-publique`}
                              className="rounded-lg border border-[#E8E9EF] bg-white px-3 py-1.5 text-xs font-semibold text-[#414350] transition hover:border-[#6A4FE6] hover:text-[#6A4FE6]">
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
