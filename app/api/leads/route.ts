import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { date: 'desc' },
    include: {
      brand: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(leads)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.brandId) return NextResponse.json({ error: 'Brand obligatoire' }, { status: 400 })
  if (!body.clientId) return NextResponse.json({ error: 'Client obligatoire' }, { status: 400 })
  if (!body.buyPrice) return NextResponse.json({ error: "Prix d'achat obligatoire" }, { status: 400 })
  if (!body.sellPrice) return NextResponse.json({ error: 'Prix de vente obligatoire' }, { status: 400 })

  const lead = await prisma.lead.create({
    data: {
      brandId: body.brandId,
      clientId: body.clientId,
      buyPrice: parseFloat(body.buyPrice),
      buyCurrency: body.buyCurrency || 'EUR',
      sellPrice: parseFloat(body.sellPrice),
      sellCurrency: body.sellCurrency || 'EUR',
      label: body.label || null,
      date: body.date ? new Date(body.date) : new Date(),
    },
  })
  return NextResponse.json(lead, { status: 201 })
}