import { prisma } from '@/lib/prisma'
import { sendLeadEmail, parseRecipients } from '@/lib/mail'

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
    include: { campagne: { include: { client: { select: { name: true, email: true, notifyEmails: true } } } } },
  })
  if (!dossier || !dossier.active) return json({ error: 'token invalide' }, 401)

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

  // 6. Enregistrement (requête préparée via Prisma)
  await prisma.inboundLead.create({
    data: {
      dossierId: dossier.id,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message,
      source,
      status,
      ip,
    },
  })

  // 7. Transfert e-mail automatique (leads valides uniquement). Destinataires du site, sinon e-mail du client.
  if (status === 'VALID') {
    // Priorité : e-mails du site → e-mails du client → e-mail de contact du client.
    const client = dossier.campagne.client
    let recipients = parseRecipients(dossier.notifyEmails)
    if (recipients.length === 0) recipients = parseRecipients(client.notifyEmails)
    if (recipients.length === 0) recipients = parseRecipients(client.email)
    if (recipients.length > 0) {
      try {
        await sendLeadEmail({
          to: recipients,
          replyTo: email || undefined,
          siteName: dossier.name,
          campagneName: dossier.campagne.name,
          clientName: dossier.campagne.client.name,
          lead: { name, email, phone, message, source },
        })
      } catch {
        // L'échec d'envoi ne doit jamais casser la réception du lead.
      }
    }
  }

  return json({ status: 'ok', statut: status === 'DUPLICATE' ? 'doublon' : 'valide' }, 200)
}
