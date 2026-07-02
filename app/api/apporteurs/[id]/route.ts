import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère un apporteur en vérifiant qu'il appartient au périmètre de l'utilisateur (USER = les siens, ADMIN = tous).
async function findOwnedApporteur(id: string, user: { id: string; role: string }) {
  return prisma.apporteur.findFirst({ where: { id, ...visibilityFilter(user) } })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const apporteur = await findOwnedApporteur(id, user)
  if (!apporteur) return NextResponse.json({ error: 'Apporteur introuvable' }, { status: 404 })
  return NextResponse.json(apporteur)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedApporteur(id, user)
  if (!existing) return NextResponse.json({ error: 'Apporteur introuvable' }, { status: 404 })

  const body = await request.json()

  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (body.commissionType && !['PERCENT', 'FIXED'].includes(body.commissionType)) {
    return NextResponse.json({ error: 'Type de commission invalide' }, { status: 400 })
  }
  if (body.commissionType === 'PERCENT' && body.commissionValue > 100) {
    return NextResponse.json({ error: 'Pourcentage > 100' }, { status: 400 })
  }
  if (body.commissionValue !== undefined && body.commissionValue < 0) {
    return NextResponse.json({ error: 'Valeur négative' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if ('email' in body) data.email = body.email?.trim() || null
  if ('phone' in body) data.phone = body.phone?.trim() || null
  if (body.commissionType) data.commissionType = body.commissionType
  if (body.commissionValue !== undefined) data.commissionValue = parseFloat(body.commissionValue)

  const apporteur = await prisma.apporteur.update({ where: { id }, data })
  return NextResponse.json(apporteur)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedApporteur(id, user)
  if (!existing) return NextResponse.json({ error: 'Apporteur introuvable' }, { status: 404 })

  await prisma.apporteur.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
