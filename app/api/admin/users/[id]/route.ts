import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH — modifier le rôle / le nom / le mot de passe d'un utilisateur
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  if (id === me.id && body.role && body.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle admin' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.role && ['ADMIN', 'USER'].includes(body.role)) data.role = body.role

  // Réinitialisation du mot de passe par l'admin
  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe : 6 caractères minimum' }, { status: 400 })
    }
    data.password = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({ where: { id }, data, omit: { password: true } })
  return NextResponse.json(user)
}

// DELETE — supprimer un utilisateur
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  if (id === me.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
