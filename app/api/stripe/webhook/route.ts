import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Cette config est obligatoire pour que Next.js nous donne le body brut
// (Stripe a besoin du body exact pour vérifier la signature)
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret manquant' }, { status: 500 })
  }

  let event: Stripe.Event

  // Vérifie que le message vient bien de Stripe (et pas d'un attaquant)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('❌ Signature webhook invalide :', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  console.log('📩 Webhook reçu :', event.type)

  // Traitement des événements qui nous intéressent
  try {
    switch (event.type) {

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice

        // On retrouve la facture dans notre base via stripeInvoiceId
        const updated = await prisma.invoice.updateMany({
          where: { stripeInvoiceId: invoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })

        console.log(`✅ Facture ${invoice.id} marquée payée (${updated.count} mise(s) à jour)`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`❌ Paiement échoué pour ${invoice.id}`)
        // Ici on pourrait notifier l'utilisateur, pour l'instant on log
        break
      }

      default:
        console.log(`⏭ Événement ignoré : ${event.type}`)
    }
  } catch (err) {
    console.error('Erreur traitement webhook :', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}