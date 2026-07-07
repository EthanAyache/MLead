import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { stripe, getVatRateId } from '@/lib/stripe'
import { creditPrepaidBalance } from '@/lib/prepaid'
import { sendInvoiceToClientAndAdmin } from '@/lib/invoiceNotify'

export const runtime = 'nodejs'

// Recharge le solde prépayé d'un client.
//   body = { mode: 'manual' | 'stripe', amount: number (€ HT), note?: string }
//   - manual : crédite immédiatement le solde (paiement encaissé hors ligne / geste commercial).
//   - stripe : émet une facture Stripe (montant HT + TVA) ; le solde est crédité au paiement (webhook).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const client = await prisma.client.findFirst({ where: { id, ...visibilityFilter(user) } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const body = await request.json()
  const amount = Math.round(parseFloat(body.amount) * 100) / 100
  if (!(amount > 0)) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 190) || null : null

  // --- Ajustement manuel : crédité tout de suite ---
  if (body.mode === 'manual') {
    await prisma.prepaidTopup.create({
      data: { clientId: client.id, amount, currency: 'EUR', status: 'MANUAL', note, paidAt: new Date() },
    })
    await creditPrepaidBalance(client.id, amount)
    const updated = await prisma.client.findUnique({ where: { id: client.id }, select: { prepaidBalance: true } })
    return NextResponse.json({ ok: true, balance: updated?.prepaidBalance ?? null })
  }

  // --- Paiement Stripe : facture (HT + TVA) ; crédit au paiement via le webhook ---
  if (body.mode === 'stripe') {
    if (!client.email) return NextResponse.json({ error: 'Le client doit avoir un e-mail pour payer par Stripe' }, { status: 400 })
    try {
      let stripeCustomerId = client.stripeCustomerId
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ name: client.name, email: client.email, phone: client.phone ?? undefined })
        stripeCustomerId = customer.id
        await prisma.client.update({ where: { id: client.id }, data: { stripeCustomerId } })
      }

      const stripeInvoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'send_invoice',
        days_until_due: 7,
        metadata: { mrlead_prepaid_topup: '1', mrlead_client_id: client.id },
      })
      if (!stripeInvoice.id) throw new Error("Stripe : pas d'ID de facture")

      // On mémorise le topup + l'ID Stripe AVANT de finaliser (le webhook s'appuie dessus pour créditer).
      await prisma.prepaidTopup.create({
        data: { clientId: client.id, amount, currency: 'EUR', status: 'PENDING', stripeInvoiceId: stripeInvoice.id, note },
      })

      const vatRateId = await getVatRateId()
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(amount * 100),
        currency: 'eur',
        description: `Recharge solde leads — ${amount.toFixed(2)} € HT`,
        tax_rates: [vatRateId],
      })

      await stripe.invoices.finalizeInvoice(stripeInvoice.id)
      await sendInvoiceToClientAndAdmin(stripeInvoice.id, { clientName: client.name, kind: 'Recharge de solde' })

      return NextResponse.json({ ok: true, stripeInvoiceId: stripeInvoice.id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur Stripe'
      return NextResponse.json({ error: 'Stripe : ' + message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Mode invalide (manual ou stripe)' }, { status: 400 })
}
