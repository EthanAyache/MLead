import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export const runtime = 'nodejs'

// Annule/supprime une facture mensuelle (admin). Délie ses leads (ils redeviennent
// facturables → on peut relancer la facturation du mois), et annule la facture Stripe
// si elle n'est pas déjà payée. Utile pour re-tester ou corriger une erreur.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const { id } = await params
  const mi = await prisma.monthlyInvoice.findFirst({
    where: { id, client: { ...visibilityFilter(user) } },
    select: { id: true, stripeInvoiceId: true, status: true },
  })
  if (!mi) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  // Annule la facture Stripe si elle est encore ouverte (non payée)
  if (mi.stripeInvoiceId && mi.status !== 'PAID') {
    try {
      await stripe.invoices.voidInvoice(mi.stripeInvoiceId)
    } catch {
      // best-effort : si Stripe refuse (déjà void/payée), on continue quand même
    }
  }

  await prisma.$transaction([
    prisma.inboundLead.updateMany({ where: { monthlyInvoiceId: id }, data: { monthlyInvoiceId: null } }),
    prisma.monthlyInvoice.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
