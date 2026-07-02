import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendLeadEmail, resolveLeadRecipients } from '@/lib/mail'
import Stripe from 'stripe'

// Cette config est obligatoire pour que Next.js nous donne le body brut
// (Stripe a besoin du body exact pour vérifier la signature)
export const runtime = 'nodejs'

// Renvoi des leads retenus pendant une suspension, une fois le client régularisé.
// Ne renvoie que les leads valides non encore transmis (forwardedToClient=false) et seulement si
// le client n'est plus bloqué par une autre facture SENT impayée. Chaque lead envoyé est marqué
// forwardedToClient=true → aucun envoi en double, même si Stripe rejoue le webhook.
async function forwardHeldLeadsForClient(clientId: string) {
  const stillBlocked = await prisma.monthlyInvoice.findFirst({
    where: { clientId, status: 'SENT' },
    select: { id: true },
  })
  if (stillBlocked) return

  const held = await prisma.inboundLead.findMany({
    where: {
      status: 'VALID',
      assignedToJboost: false,
      forwardedToClient: false,
      dossier: { campagne: { clientId } },
    },
    include: {
      dossier: {
        select: {
          name: true,
          notifyEmails: true,
          campagne: {
            select: { name: true, client: { select: { name: true, email: true, notifyEmails: true } } },
          },
        },
      },
    },
  })

  for (const lead of held) {
    const d = lead.dossier
    const client = d.campagne.client
    const recipients = resolveLeadRecipients({
      siteNotifyEmails: d.notifyEmails,
      clientNotifyEmails: client.notifyEmails,
      clientEmail: client.email,
    })
    if (recipients.length > 0) {
      try {
        await sendLeadEmail({
          to: recipients,
          replyTo: lead.email || undefined,
          siteName: d.name,
          campagneName: d.campagne.name,
          clientName: client.name,
          lead: { name: lead.name, email: lead.email, phone: lead.phone, message: lead.message, source: lead.source },
          note: 'Lead reçu pendant la suspension de votre compte — transmis suite à la régularisation.',
        })
      } catch (e) {
        // Échec d'envoi : on NE marque PAS le lead transmis → il sera retenté au prochain paiement/webhook.
        console.error('[resend-held] échec envoi:', (e as Error)?.message || e)
        continue
      }
    }
    await prisma.inboundLead.update({ where: { id: lead.id }, data: { forwardedToClient: true } })
  }
}

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

        if (invoice.id) {
          // Facture générique (modèle Invoice)
          const updated = await prisma.invoice.updateMany({
            where: { stripeInvoiceId: invoice.id },
            data: { status: 'PAID', paidAt: new Date() },
          })
          // Facture mensuelle pay-per-lead (modèle MonthlyInvoice) → lève le blocage des leads
          const updatedMonthly = await prisma.monthlyInvoice.updateMany({
            where: { stripeInvoiceId: invoice.id },
            data: { status: 'PAID' },
          })
          console.log(`✅ Facture ${invoice.id} payée (Invoice: ${updated.count}, MonthlyInvoice: ${updatedMonthly.count})`)

          // Régularisation : renvoyer au(x) client(s) concerné(s) les leads retenus pendant la suspension.
          if (updatedMonthly.count > 0) {
            const paid = await prisma.monthlyInvoice.findMany({
              where: { stripeInvoiceId: invoice.id },
              select: { clientId: true },
            })
            for (const clientId of [...new Set(paid.map((p) => p.clientId))]) {
              await forwardHeldLeadsForClient(clientId)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.id) {
          await prisma.monthlyInvoice.updateMany({
            where: { stripeInvoiceId: invoice.id },
            data: { status: 'FAILED' },
          })
        }
        console.log(`❌ Paiement échoué pour ${invoice.id}`)
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