import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SignupForm from './SignupForm'

// L'inscription publique n'est ouverte QUE pour l'amorçage (création du tout premier compte).
// Dès qu'un compte existe, on redirige vers la connexion : les comptes suivants sont créés par
// un administrateur depuis l'espace Admin.
export default async function SignupPage() {
  const userCount = await prisma.user.count()
  if (userCount > 0) redirect('/login')
  return <SignupForm />
}
