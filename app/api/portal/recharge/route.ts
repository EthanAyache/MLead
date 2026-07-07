import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, getVatRateId } from '@/lib/stripe'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'

export const runtime = 'nodejs'

// Le client (connecté au portail) achète un pack de leads : facture Stripe (HT + TVA), payable par carte.
// Le solde est crédité au paiement (webhook invoice.paid). Body : { amount: number (€ HT) }.
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json({ error: 'Réglez d\'abord votre facture d\'arrêt en attente avant d\'acheter des leads.' }, { status: 409 })
  }
  if (!client.email) return NextResponse.json({ error: 'Aucun e-mail associé à votre compte' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const amount = Math.round(parseFloat(body.amount) * 100) / 100
  if (!(amount > 0)) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  if (amount > 100000) return NextResponse.json({ error: 'Montant trop élevé' }, { status: 400 })

  try {
    // On ne bascule PAS en prépayé ici : ce sera fait au paiement réel (webhook), pour ne pas
    // coincer le client en prépayé à 0 € s'il abandonne le paiement.
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

    await prisma.prepaidTopup.create({
      data: { clientId: client.id, amount, currency: 'EUR', status: 'PENDING', stripeInvoiceId: stripeInvoice.id, note: 'Achat en ligne (portail client)' },
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

    const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id)
    // On renvoie la page de paiement Stripe hébergée (carte) : le client y règle directement.
    return NextResponse.json({ ok: true, payUrl: finalized.hosted_invoice_url ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur Stripe'
    return NextResponse.json({ error: 'Stripe : ' + message }, { status: 500 })
  }
}
