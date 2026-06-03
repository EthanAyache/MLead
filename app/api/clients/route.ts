import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const clients = await prisma.client.findMany({
    where: { archived: false, ...visibilityFilter(user) },
    orderBy: { name: 'asc' },
    include: { apporteur: { select: { id: true, name: true } } },
  })
  return NextResponse.json(clients)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })
  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const client = await prisma.client.create({
    data: {
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      apporteurId: body.apporteurId || null,
      userId: user.id,
    },
  })
  return NextResponse.json(client, { status: 201 })
}