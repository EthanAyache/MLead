import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const apporteurs = await prisma.apporteur.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(apporteurs)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
  }
  const apporteur = await prisma.apporteur.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      commissionType: body.commissionType || 'PERCENT',
      commissionValue: parseFloat(body.commissionValue) || 0,
    },
  })
  return NextResponse.json(apporteur, { status: 201 })
}