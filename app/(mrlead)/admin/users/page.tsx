import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/app/(mrlead)/dashboard/Header'
import UsersTable from './UsersTable'

export default async function AdminUsersPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  if (me.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />

      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        <div className="flex items-start gap-4 flex-wrap mb-[18px] mt-2">
          <div>
            <h1 className="font-bricolage text-[27px] font-bold text-[#16171D] tracking-tight">
              Gestion des utilisateurs
            </h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[560px]">
              Créez, modifiez et supprimez les comptes utilisateurs de Mr.Lead.
            </p>
          </div>
        </div>

        <UsersTable users={users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          isMe: u.id === me.id,
        }))} />
      </main>
    </div>
  )
}