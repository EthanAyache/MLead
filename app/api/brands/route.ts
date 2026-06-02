import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(brands)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
  }
  const brand = await prisma.brand.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
    },
  })
  return NextResponse.json(brand, { status: 201 })
}