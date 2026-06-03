import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apporteur = await prisma.apporteur.findUnique({ where: { id } })
  if (!apporteur) return NextResponse.json({ error: 'Apporteur introuvable' }, { status: 404 })
  return NextResponse.json(apporteur)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const { id } = await params
  await prisma.apporteur.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}