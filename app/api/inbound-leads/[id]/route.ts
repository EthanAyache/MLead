import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { sendLeadEmail, resolveLeadRecipients, parseLabeledRecipients, parseRecipients } from '@/lib/mail'

const ALLOWED = ['VALID', 'DUPLICATE', 'REJECTED'] as const
type Status = (typeof ALLOWED)[number]

// Notifie par e-mail au moment où un lead devient facturable (validation d'un doublon, retour au client).
// Comportement identique à la réception (ingest) :
//   - client non suspendu → envoi au client + marquage forwardedToClient=true.
//   - client suspendu      → on prévient SEULEMENT JBoost (bandeau), sans marquer transmis : le lead
//                            sera renvoyé au client à la régularisation (webhook invoice.paid).
// Évite qu'un client paie un lead qu'il n'a jamais reçu.
async function forwardLeadToClientIfNeeded(leadId: string) {
  const lead = await prisma.inboundLead.findUnique({
    where: { id: leadId },
    include: {
      dossier: {
        select: {
          name: true,
          notifyEmails: true,
          campagne: {
            select: { name: true, clientId: true, client: { select: { name: true, email: true, notifyEmails: true } } },
          },
        },
      },
    },
  })
  if (!lead) return
  if (lead.status !== 'VALID' || lead.assignedToJboost || lead.forwardedToClient) return

  const d = lead.dossier
  const client = d.campagne.client
  const leadInfo = { name: lead.name, email: lead.email, phone: lead.phone, message: lead.message, source: lead.source }

  const blocked = await prisma.monthlyInvoice.findFirst({
    where: { clientId: d.campagne.clientId, status: 'SENT' },
    select: { id: true },
  })

  if (blocked) {
    // On prévient uniquement JBoost (labels « Mail JBoost » du site → du client → fallback JBOOST_EMAIL).
    const site = parseLabeledRecipients(d.notifyEmails)
    const cli = parseLabeledRecipients(client.notifyEmails)
    const recipients = [...new Set(site.jboost.length ? site.jboost : cli.jboost.length ? cli.jboost : parseRecipients(process.env.JBOOST_EMAIL))]
    if (recipients.length > 0) {
      try {
        await sendLeadEmail({
          to: recipients,
          replyTo: lead.email || undefined,
          siteName: d.name,
          campagneName: d.campagne.name,
          clientName: client.name,
          lead: leadInfo,
          note: `⚠️ ${client.name} suspendu (facture impayée) — lead NON transmis au client. Il sera transmis dès régularisation.`,
        })
      } catch (e) {
        console.error('[lead-validate-mail] échec envoi (bloqué):', (e as Error)?.message || e)
      }
    }
    return // pas de forwardedToClient=true : le lead reste à renvoyer au paiement
  }

  // Client non suspendu : envoi au client (cascade site → client → e-mail du client).
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
        lead: leadInfo,
      })
    } catch (e) {
      // Échec d'envoi : on ne marque pas transmis → il sera retenté (validation ou paiement ultérieur).
      console.error('[lead-validate-mail] échec envoi:', (e as Error)?.message || e)
      return
    }
  }
  await prisma.inboundLead.update({ where: { id: leadId }, data: { forwardedToClient: true } })
}

// Récupère un lead en vérifiant qu'il appartient bien au périmètre de l'utilisateur (USER = ses clients).
async function findOwnedLead(id: string, user: { id: string; role: string }) {
  return prisma.inboundLead.findFirst({
    where: { id, dossier: { campagne: { client: visibilityFilter(user) } } },
  })
}

// Modifier un lead : statut, affectation JBoost, offres choisies.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const lead = await findOwnedLead(id, user)
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  if (lead.monthlyInvoiceId) {
    return NextResponse.json({ error: 'Lead déjà facturé, modification verrouillée' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if ('status' in body) {
    const status = body.status as Status
    if (!ALLOWED.includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    data.status = status
  }

  // Affectation à JBoost (exclut le lead de la facture). Si on le rend au client, on efface les offres choisies.
  let returnedToClient = false
  if ('assignedToJboost' in body) {
    data.assignedToJboost = !!body.assignedToJboost
    if (!body.assignedToJboost) {
      data.chosenOffers = { set: [] }
      returnedToClient = true
    }
  }

  // Offres choisies par le lead (plusieurs possibles). Doivent appartenir au site du lead.
  if (!returnedToClient && 'chosenOfferIds' in body) {
    const ids: string[] = Array.isArray(body.chosenOfferIds) ? body.chosenOfferIds.map((x: unknown) => String(x)) : []
    if (ids.length > 0) {
      const offers = await prisma.offer.findMany({ where: { id: { in: ids } } })
      if (offers.length !== ids.length || offers.some((o) => o.dossierId !== lead.dossierId)) {
        return NextResponse.json({ error: 'Offre invalide pour ce lead' }, { status: 400 })
      }
    }
    data.chosenOffers = { set: ids.map((id) => ({ id })) }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })
  }

  const updated = await prisma.inboundLead.update({ where: { id }, data })

  // Notifier uniquement quand le lead DEVIENT facturable maintenant : validation (→ VALID depuis un
  // autre statut) ou retour au client. Évite un renvoi/spam à chaque autre modif d'un lead déjà valide.
  const becameValid = data.status === 'VALID' && lead.status !== 'VALID'
  if (becameValid || returnedToClient) {
    await forwardLeadToClientIfNeeded(id)
  }

  return NextResponse.json(updated)
}

// Suppression définitive d'un lead (utilisé surtout pour effacer un doublon).
// Un lead déjà facturé est protégé, SAUF si un ADMIN force (?force=1) : la facture
// déjà émise n'est pas modifiée (elle reste l'historique de ce qui a été facturé).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const lead = await findOwnedLead(id, user)
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

  const force = new URL(request.url).searchParams.get('force') === '1'
  if (lead.monthlyInvoiceId && !(force && user.role === 'ADMIN')) {
    return NextResponse.json({ error: 'Lead déjà facturé, suppression impossible' }, { status: 409 })
  }

  await prisma.inboundLead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
