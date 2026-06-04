import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import AddApporteurForm from './AddApporteurForm'
import SearchAndList from './SearchAndList'

export default async function ApporteursPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const filter = visibilityFilter(me)

  const apporteurs = await prisma.apporteur.findMany({
    where: { archived: false, ...filter },
    orderBy: { name: 'asc' },
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apporteurs d'affaires</h1>
            <p className="text-gray-500 text-sm mt-1">
              {apporteurs.length} apporteur{apporteurs.length > 1 ? 's' : ''} actif{apporteurs.length > 1 ? 's' : ''}
            </p>
          </div>
          <AddApporteurForm />
        </div>

        <SearchAndList apporteurs={apporteurs} />
      </div>
      </main>
    </>
  )
}