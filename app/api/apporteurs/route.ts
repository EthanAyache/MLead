import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const apporteurs = await prisma.apporteur.findMany({
    where: { archived: false, ...visibilityFilter(user) },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(apporteurs)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })
  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (body.commissionType && !['PERCENT', 'FIXED'].includes(body.commissionType)) {
    return NextResponse.json({ error: 'Type de commission invalide' }, { status: 400 })
  }
  if (body.commissionType === 'PERCENT' && body.commissionValue > 100) {
    return NextResponse.json({ error: 'Pourcentage > 100' }, { status: 400 })
  }

  const apporteur = await prisma.apporteur.create({
    data: {
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      commissionType: body.commissionType || 'PERCENT',
      commissionValue: parseFloat(body.commissionValue) || 10,
      userId: user.id,
    },
  })
  return NextResponse.json(apporteur, { status: 201 })
}