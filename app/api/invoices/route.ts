import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    where: { archived: false },
    orderBy: { issueDate: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.number) return NextResponse.json({ error: 'Numéro obligatoire' }, { status: 400 })
  if (!body.amount) return NextResponse.json({ error: 'Montant obligatoire' }, { status: 400 })
  if (!body.dueDate) return NextResponse.json({ error: 'Échéance obligatoire' }, { status: 400 })
  if (!body.clientId && !body.brandId) {
    return NextResponse.json({ error: 'Choisissez un client OU une brand' }, { status: 400 })
  }
  if (body.clientId && body.brandId) {
    return NextResponse.json({ error: 'Une facture ne peut pas être pour un client ET une brand' }, { status: 400 })
  }

  // Calcul automatique du statut LATE si dueDate passée
  const due = new Date(body.dueDate)
  const status = due < new Date() ? 'LATE' : 'PENDING'

  const invoice = await prisma.invoice.create({
    data: {
      number: body.number,
      amount: parseFloat(body.amount),
      currency: body.currency || 'EUR',
      status,
      dueDate: due,
      clientId: body.clientId || null,
      brandId: body.brandId || null,
    },
  })
  return NextResponse.json(invoice, { status: 201 })
}