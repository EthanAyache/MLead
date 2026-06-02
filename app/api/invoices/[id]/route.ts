import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/invoices/[id] → modifier une facture (statut, archive...)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}

  if (body.action === 'mark_paid') {
    data.status = 'PAID'
    data.paidAt = new Date()
  } else if (body.action === 'archive') {
    data.archived = true
  } else if (body.action === 'unarchive') {
    data.archived = false
  } else {
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

// DELETE /api/invoices/[id] → supprimer définitivement (avec ses paiements)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.payment.deleteMany({ where: { invoiceId: id } })
  await prisma.invoice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}