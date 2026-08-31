export const revalidate = 30

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/(mrlead)/dashboard/Header'
import DepartementsView, { type SiteRow } from './DepartementsView'

export default async function DepartementsPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  const filter = visibilityFilter(me)

  const sites = await prisma.dossier.findMany({
    where: { campagne: { client: filter } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      department: true,
      active: true,
      campagne: { select: { name: true, client: { select: { name: true } } } },
      _count: { select: { leads: true } },
    },
  })

  const rows: SiteRow[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    department: s.department,
    active: s.active,
    clientName: s.campagne.client.name,
    campagneName: s.campagne.name,
    leadCount: s._count.leads,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto p-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Départements</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Chaque site est rangé dans un département. Filtre par département et cherche pour retrouver rapidement un site
            (utile quand tu ne sais plus où il est). Le département d&apos;un site se règle sur la page du site.
          </p>
        </div>

        <DepartementsView rows={rows} />
      </main>
    </div>
  )
}
