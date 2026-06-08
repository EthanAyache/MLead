import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type RawProspect = { name?: unknown; email?: unknown; phone?: unknown; details?: unknown; source?: unknown }

function clean(input: RawProspect) {
  const name = String(input.name ?? '').trim()
  if (!name) return null
  return {
    name,
    email: String(input.email ?? '').trim() || null,
    phone: String(input.phone ?? '').trim() || null,
    details: String(input.details ?? '').trim() || null,
    source: String(input.source ?? '').trim() || null,
  }
}

// Clés de dédoublonnage normalisées (email + téléphone)
const normEmail = (e: string | null) => (e ? e.toLowerCase().trim() : null)
const normPhone = (p: string | null) => {
  if (!p) return null
  const digits = p.replace(/\D/g, '')
  return digits.length >= 6 ? digits : null
}

// Ajout d'un prospect au stock d'un thème, ou import en lot (CSV / Excel).
// body = { themeId, prospects: RawProspect[], dedupe?: boolean }  (un seul = tableau de 1)
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const themeId = body.themeId
  if (!themeId) return NextResponse.json({ error: 'Thème obligatoire' }, { status: 400 })

  const theme = await prisma.theme.findUnique({ where: { id: themeId } })
  if (!theme) return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 })

  const list: RawProspect[] = Array.isArray(body.prospects) ? body.prospects : []
  const rows = list.map(clean).filter((r): r is NonNullable<ReturnType<typeof clean>> => r !== null)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aucun prospect valide (le nom est obligatoire)' }, { status: 400 })
  }

  let toCreate = rows
  let skipped = 0

  // Filtre des doublons (activé par défaut) : sur l'email OU le téléphone,
  // à la fois dans le lot lui-même et contre le stock déjà présent dans ce thème.
  if (body.dedupe !== false) {
    const existing = await prisma.prospect.findMany({
      where: { themeId },
      select: { email: true, phone: true },
    })
    const seenEmails = new Set<string>()
    const seenPhones = new Set<string>()
    for (const e of existing) {
      const em = normEmail(e.email)
      const ph = normPhone(e.phone)
      if (em) seenEmails.add(em)
      if (ph) seenPhones.add(ph)
    }

    const kept: typeof rows = []
    for (const r of rows) {
      const em = normEmail(r.email)
      const ph = normPhone(r.phone)
      const isDup = (em && seenEmails.has(em)) || (ph && seenPhones.has(ph))
      if (isDup) {
        skipped++
        continue
      }
      if (em) seenEmails.add(em)
      if (ph) seenPhones.add(ph)
      kept.push(r)
    }
    toCreate = kept
  }

  const created = toCreate.length
    ? (await prisma.prospect.createMany({
        data: toCreate.map((r) => ({ ...r, themeId, userId: user.id })),
      })).count
    : 0

  return NextResponse.json({ created, skipped }, { status: 201 })
}

// Suppression d'un prospect du stock (uniquement s'il n'est pas vendu)
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const prospect = await prisma.prospect.findUnique({ where: { id } })
  if (!prospect) return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
  if (prospect.status === 'SOLD') {
    return NextResponse.json({ error: 'Impossible de supprimer un prospect déjà vendu' }, { status: 409 })
  }

  await prisma.prospect.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
