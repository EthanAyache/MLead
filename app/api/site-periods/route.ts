import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { slugify } from '@/lib/generatedSite'

// Périodes commerciales proposées à la création d'un site (Souccot, Pessah, été…). ADMIN uniquement.
async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })

  const slug = slugify(body.slug || name)
  if (!slug) return NextResponse.json({ error: 'Nom invalide (lettres ou chiffres attendus)' }, { status: 400 })
  if (await prisma.sitePeriod.findUnique({ where: { slug }, select: { id: true } })) {
    return NextResponse.json({ error: 'Une période utilise déjà cette adresse.' }, { status: 400 })
  }

  const period = await prisma.sitePeriod.create({
    data: { name, slug, position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0 },
  })
  return NextResponse.json(period, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const period = await prisma.sitePeriod.findUnique({ where: { id: String(body.id ?? '') }, select: { id: true } })
  if (!period) return NextResponse.json({ error: 'Période introuvable' }, { status: 404 })

  // Le slug reste figé : il fait partie de l'adresse des sites déjà créés.
  const data: { name?: string; active?: boolean; position?: number } = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })
    data.name = name
  }
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.position !== undefined && Number.isFinite(Number(body.position))) data.position = Number(body.position)

  const updated = await prisma.sitePeriod.update({ where: { id: period.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id') ?? ''
  const used = await prisma.generatedSite.count({ where: { periodId: id } })
  if (used > 0) {
    return NextResponse.json(
      { error: `${used} site(s) utilisent cette période : désactivez-la plutôt que de la supprimer.` },
      { status: 400 },
    )
  }
  await prisma.sitePeriod.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
