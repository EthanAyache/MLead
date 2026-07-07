import { prisma } from '@/lib/prisma'
import { sendLeadEmail, resolveLeadRecipients } from '@/lib/mail'
import { coerceExtra } from '@/lib/leadExtra'

// Livre les leads retenus d'un client prépayé (plus ancien d'abord), tant que le solde couvre le prix
// de leur site. Retourne le solde restant. Chaque lead livré est marqué forwardedToClient=true.
async function deliverHeldPrepaidLeads(clientId: string, startingBalance: number): Promise<number> {
  let balance = startingBalance
  const held = await prisma.inboundLead.findMany({
    where: { status: 'VALID', assignedToJboost: false, forwardedToClient: false, dossier: { campagne: { clientId } } },
    orderBy: { receivedAt: 'asc' },
    include: {
      dossier: {
        select: {
          name: true,
          unitPrice: true,
          notifyEmails: true,
          campagne: { select: { name: true, client: { select: { name: true, email: true, notifyEmails: true } } } },
        },
      },
    },
  })

  for (const lead of held) {
    const price = lead.dossier.unitPrice
    // FIFO : on s'arrête au premier lead que le solde ne couvre pas (les sites à 0 € passent toujours).
    if (price > 0 && balance < price) break

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
          extra: coerceExtra(lead.extra),
          note: 'Lead reçu pendant l’épuisement de votre solde — transmis suite à votre rechargement.',
        })
      } catch (e) {
        // Échec d'envoi : on ne consomme pas le solde et on ne marque pas transmis → retenté au prochain crédit.
        console.error('[prepaid-resend] échec envoi:', (e as Error)?.message || e)
        break
      }
    }
    if (price > 0) balance -= price
    await prisma.inboundLead.update({ where: { id: lead.id }, data: { forwardedToClient: true } })
  }
  return balance
}

// Crédite le solde prépayé d'un client (montant en €), puis livre les leads retenus dans la limite du solde.
// Réutilisé par le rechargement manuel (admin) et par le webhook Stripe (paiement d'un pack).
export async function creditPrepaidBalance(clientId: string, amount: number): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { billingMode: true, prepaidBalance: true },
  })
  if (!client) return

  let balance = client.prepaidBalance + Math.max(0, amount)
  if (client.billingMode === 'PREPAID') {
    balance = await deliverHeldPrepaidLeads(clientId, balance)
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { prepaidBalance: balance, prepaidDepletedNotified: false },
  })
}
