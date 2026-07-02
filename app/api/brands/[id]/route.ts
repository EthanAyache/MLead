import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère une brand en vérifiant qu'elle appartient au périmètre de l'utilisateur (USER = les siennes, ADMIN = toutes).
async function findOwnedBrand(id: string, user: { id: string; role: string }) {
  return prisma.brand.findFirst({ where: { id, ...visibilityFilter(user) } })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const brand = await findOwnedBrand(id, user)
  if (!brand) return NextResponse.json({ error: 'Brand introuvable' }, { status: 404 })
  return NextResponse.json(brand)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedBrand(id, user)
  if (!existing) return NextResponse.json({ error: 'Brand introuvable' }, { status: 404 })

  const body = await request.json()

  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if ('email' in body) data.email = body.email?.trim() || null
  if ('phone' in body) data.phone = body.phone?.trim() || null

  const brand = await prisma.brand.update({ where: { id }, data })
  return NextResponse.json(brand)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedBrand(id, user)
  if (!existing) return NextResponse.json({ error: 'Brand introuvable' }, { status: 404 })

  await prisma.brand.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
