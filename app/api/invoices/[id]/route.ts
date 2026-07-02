import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère une facture en vérifiant qu'elle appartient au périmètre de l'utilisateur (USER = les siennes, ADMIN = toutes).
async function findOwnedInvoice(id: string, user: { id: string; role: string }) {
  return prisma.invoice.findFirst({ where: { id, ...visibilityFilter(user) } })
}

// PATCH /api/invoices/[id] → modifier une facture (statut, archive...)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedInvoice(id, user)
  if (!existing) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

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
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedInvoice(id, user)
  if (!existing) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  await prisma.payment.deleteMany({ where: { invoiceId: id } })
  await prisma.invoice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
