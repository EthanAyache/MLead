import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clamp(value: unknown, max = 190) {
  return String(value ?? '').trim().slice(0, max)
}

// Création manuelle d'un lead (bouton « Ajouter un lead »). Réservé à un utilisateur connecté,
// et uniquement sur un de ses sites. Sans `force`, si un lead avec le même email OU téléphone
// existe déjà sur ce site, on ne crée rien et on renvoie { duplicate: true } pour que l'UI
// affiche l'avertissement et propose d'ajouter quand même (force=true).
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const dossierId = String(body.dossierId || '')

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, campagne: { client: visibilityFilter(user) } },
    select: { id: true },
  })
  if (!dossier) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const name = clamp(body.nom ?? body.name)
  let email = clamp(body.email).toLowerCase()
  if (email && !EMAIL_RE.test(email)) email = ''
  const phone = clamp(body.telephone ?? body.phone, 50)
  const message = String(body.message ?? '').trim().slice(0, 5000) || null
  const source = clamp(body.source) || 'Ajout manuel'

  if (!name && !email && !phone) {
    return NextResponse.json({ error: 'Renseignez au moins un nom, un email ou un téléphone.' }, { status: 400 })
  }

  const force = body.force === true
  const assignedToJboost = body.assignedToJboost === true

  // Détection de doublon (même email OU téléphone sur ce site)
  if (!force && (email || phone)) {
    const or: Array<Record<string, string>> = []
    if (email) or.push({ email })
    if (phone) or.push({ phone })
    const dupe = await prisma.inboundLead.findFirst({ where: { dossierId, OR: or }, select: { id: true } })
    if (dupe) return NextResponse.json({ duplicate: true })
  }

  const lead = await prisma.inboundLead.create({
    data: { dossierId, name: name || null, email: email || null, phone: phone || null, message, source, status: 'VALID', assignedToJboost },
  })
  return NextResponse.json({ ok: true, id: lead.id })
}
