import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET — liste tous les utilisateurs (admin only)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    omit: { password: true }, // ne jamais exposer le hash du mot de passe
  })
  return NextResponse.json(users)
}

// POST — créer un utilisateur (admin only)
export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email || !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: 'Mot de passe : 6 caractères minimum' }, { status: 400 })
  }
  if (!body.role || !['ADMIN', 'USER'].includes(body.role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // Email déjà pris ?
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(body.password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name || null,
      password: hashed,
      role: body.role,
    },
    omit: { password: true }, // ne jamais renvoyer le hash du mot de passe
  })

  return NextResponse.json(user, { status: 201 })
}
