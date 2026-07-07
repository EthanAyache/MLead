import { prisma } from '@/lib/prisma'
import { sendLeadEmail, parseRecipients, parseLabeledRecipients, resolveLeadRecipients, sendQuotaDepletedEmail } from '@/lib/mail'

// Endpoint PUBLIC de réception des leads envoyés par les sites clients.
// POST /api/ingest?token=ml_xxxxxxxx   body JSON ou form { nom, email, telephone, message, source, website(honeypot) }
//
// Règles : token invalide -> 401. Honeypot rempli -> 200 mais rien enregistré.
// Doublon (même email OU téléphone dans le dossier) -> statut DUPLICATE. Sinon VALID.
// Répond toujours en JSON ; ne doit jamais casser le formulaire émetteur.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// Préflight CORS (si le site appelle l'API en fetch côté navigateur)
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      return (await request.json()) as Record<string, unknown>
    }
    // application/x-www-form-urlencoded ou multipart/form-data
    const fd = await request.formData()
    const obj: Record<string, unknown> = {}
    for (const [k, v] of fd.entries()) obj[k] = typeof v === 'string' ? v : ''
    return obj
  } catch {
    return {}
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clamp(value: unknown, max = 190) {
  return String(value ?? '').trim().slice(0, max)
}

export async function POST(request: Request) {
  // 1. Token
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!token) return json({ error: 'token invalide' }, 401)

  const dossier = await prisma.dossier.findUnique({
    where: { token },
    include: { campagne: { include: { client: { select: { id: true, name: true, email: true, notifyEmails: true, billingMode: true, prepaidBalance: true, prepaidDepletedNotified: true } } } } },
  })
  if (!dossier || !dossier.active || dossier.archived) return json({ error: 'token invalide' }, 401)

  const body = await readBody(request)

  // 2. Honeypot anti-bot : champ caché rempli -> on fait comme si tout allait bien, sans rien enregistrer.
  if (clamp(body.website).length > 0 || clamp(body._hp).length > 0) {
    return json({ status: 'ok' }, 200)
  }

  // 3. Nettoyage / validation
  const name = clamp(body.nom ?? body.name)
  let email = clamp(body.email).toLowerCase()
  if (email && !EMAIL_RE.test(email)) email = '' // email invalide -> ignoré (on garde le lead s'il a un tél)
  const phone = clamp(body.telephone ?? body.phone, 50)
  const message = (String(body.message ?? '').trim().slice(0, 5000)) || null
  const source = clamp(body.source) || null

  // Champs supplémentaires : tout ce que le formulaire envoie en plus des champs standard
  // (ex. destination, dates, compagnie…). On les garde pour les afficher dans MonsieurLead et le mail.
  const RESERVED = new Set(['token', 'website', '_hp', 'nom', 'name', 'email', 'telephone', 'phone', 'message', 'source'])
  const extraEntries: [string, string][] = []
  for (const [k, v] of Object.entries(body)) {
    if (RESERVED.has(k.toLowerCase().trim())) continue
    const val = String(v ?? '').trim().slice(0, 500)
    if (!val) continue
    extraEntries.push([k.slice(0, 60), val])
    if (extraEntries.length >= 30) break
  }
  const extra = extraEntries.length ? Object.fromEntries(extraEntries) : null

  // Au moins un moyen de contact, sinon le lead est vide
  if (!name && !email && !phone) {
    return json({ error: 'lead vide (nom, email ou téléphone requis)' }, 400)
  }

  // 4. Déduplication : même email OU même téléphone déjà présent dans CE dossier
  const or: Array<Record<string, string>> = []
  if (email) or.push({ email })
  if (phone) or.push({ phone })
  let status: 'VALID' | 'DUPLICATE' = 'VALID'
  if (or.length > 0) {
    const dupe = await prisma.inboundLead.findFirst({ where: { dossierId: dossier.id, OR: or } })
    if (dupe) status = 'DUPLICATE'
  }

  // 5. IP émettrice (derrière le proxy o2switch)
  const ip =
    (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '')
      .trim()
      .slice(0, 45) || null

  const client = dossier.campagne.client
  const isPrepaid = dossier.billingMode === 'PREPAID' // formule DU SITE
  const price = dossier.unitPrice

  // Mode "attribué à JBoost" du site : le lead est rappelé par JBoost, exclu de la facture du client
  // et NON transmis au client. Ne concerne que les leads reçus pendant que le mode est actif.
  const assignedToJboost = dossier.autoAssignJboost

  // Décision de livraison au client (leads valides, non JBoost) :
  //  - PREPAID : livré si le solde couvre le prix du site (site à 0 € toujours livré) ; sinon retenu.
  //  - MONTHLY : livré sauf si le client est suspendu (facture mensuelle SENT impayée).
  let deliverToClient = false
  let holdNote: string | undefined   // note pour JBoost quand le lead est retenu
  let consumePrice = 0               // montant à déduire du solde prépayé si le lead est livré
  let notifyDepleted = false         // prévenir le client (1re fois) que son solde est épuisé

  if (status === 'VALID' && !assignedToJboost) {
    if (isPrepaid) {
      const affordable = price <= 0 || client.prepaidBalance >= price
      if (affordable) {
        deliverToClient = true
        consumePrice = price > 0 ? price : 0
      } else {
        holdNote = `⚠️ ${client.name} — solde prépayé épuisé. Lead NON transmis au client (rechargement requis).`
        notifyDepleted = !client.prepaidDepletedNotified
      }
    } else {
      // MONTHLY : bloqué si une facture mensuelle est envoyée mais impayée (SENT). Pas sur FAILED
      // (échec Stripe de notre côté) : la facture FAILED sera rejouée au prochain run.
      const unpaid = await prisma.monthlyInvoice.findFirst({
        where: { clientId: client.id, status: 'SENT' },
        select: { id: true },
      })
      if (unpaid) {
        holdNote = `⚠️ ${client.name} suspendu (facture impayée) — lead NON transmis au client. Il sera transmis dès régularisation.`
      } else {
        deliverToClient = true
      }
    }
  }

  // 6. Enregistrement. forwardedToClient = true seulement si le lead part réellement au client.
  await prisma.inboundLead.create({
    data: {
      dossierId: dossier.id,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message,
      source,
      extra: extra ?? undefined,
      status,
      ip,
      assignedToJboost,
      forwardedToClient: deliverToClient,
    },
  })

  // Prépayé : on déduit le prix du site du solde pour chaque lead effectivement livré.
  if (consumePrice > 0) {
    await prisma.client.update({ where: { id: client.id }, data: { prepaidBalance: { decrement: consumePrice } } })
  }

  // Destinataires JBoost uniquement : labels « Mail JBoost » du site → du client → fallback JBOOST_EMAIL.
  const jboostRecipients = () => {
    const site = parseLabeledRecipients(dossier.notifyEmails)
    const cli = parseLabeledRecipients(client.notifyEmails)
    return [...new Set(site.jboost.length ? site.jboost : cli.jboost.length ? cli.jboost : parseRecipients(process.env.JBOOST_EMAIL))]
  }
  // Destinataires « client » (sans les copies JBoost), pour le mail « solde épuisé ».
  const clientRecipients = () => {
    const site = parseLabeledRecipients(dossier.notifyEmails)
    const cli = parseLabeledRecipients(client.notifyEmails)
    return [...new Set(site.client.length ? site.client : cli.client.length ? cli.client : parseRecipients(client.email))]
  }

  // 7. Transfert e-mail automatique (leads valides uniquement).
  if (status === 'VALID') {
    let recipients: string[]
    let note: string | undefined
    if (deliverToClient) {
      // Livré au client : cascade site → client → e-mail du client.
      recipients = resolveLeadRecipients({
        siteNotifyEmails: dossier.notifyEmails,
        clientNotifyEmails: client.notifyEmails,
        clientEmail: client.email,
      })
    } else if (assignedToJboost) {
      recipients = jboostRecipients()
      note = `Lead attribué à JBoost — rappelé par JBoost, non transmis / non facturé au client.`
    } else {
      // Retenu (client suspendu ou solde épuisé) : on ne prévient que JBoost.
      recipients = jboostRecipients()
      note = holdNote
    }

    if (recipients.length > 0) {
      try {
        await sendLeadEmail({
          to: recipients,
          replyTo: email || undefined,
          siteName: dossier.name,
          campagneName: dossier.campagne.name,
          clientName: client.name,
          lead: { name, email, phone, message, source },
          extra,
          note,
        })
      } catch (e) {
        // L'échec d'envoi ne doit jamais casser la réception du lead, mais on le trace.
        console.error('[lead-mail] échec envoi:', (e as Error)?.message || e)
      }
    }

    // Prépayé épuisé : prévenir le client une seule fois (puis mémoriser pour ne pas spammer).
    if (notifyDepleted) {
      await prisma.client.update({ where: { id: client.id }, data: { prepaidDepletedNotified: true } }).catch(() => {})
      const to = clientRecipients()
      if (to.length > 0) {
        try { await sendQuotaDepletedEmail({ to, clientName: client.name }) }
        catch (e) { console.error('[quota-mail] échec envoi:', (e as Error)?.message || e) }
      }
    }
  }

  return json({ status: 'ok', statut: status === 'DUPLICATE' ? 'doublon' : 'valide' }, 200)
}
