import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { slugify } from '@/lib/generatedSite'
import { DEPARTMENT_KEYS, type DepartmentKey } from '@/lib/departments'

// Thèmes proposés aux clients à la création d'un site. Réservé aux ADMIN :
// le slug d'un thème se retrouve dans l'adresse publique des sites créés.
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
  if (await prisma.siteTheme.findUnique({ where: { slug }, select: { id: true } })) {
    return NextResponse.json({ error: 'Un thème utilise déjà cette adresse.' }, { status: 400 })
  }

  const price = Number(body.defaultUnitPrice)
  const department = DEPARTMENT_KEYS.includes(body.department) ? body.department : 'AUTRE'

  const theme = await prisma.siteTheme.create({
    data: {
      name,
      slug,
      defaultUnitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
      department,
      position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
    },
  })
  return NextResponse.json(theme, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const theme = await prisma.siteTheme.findUnique({ where: { id: String(body.id ?? '') }, select: { id: true } })
  if (!theme) return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 })

  // Le slug n'est jamais modifiable : il est figé dans l'adresse des sites déjà créés.
  const data: { name?: string; defaultUnitPrice?: number; department?: DepartmentKey; active?: boolean; position?: number } = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })
    data.name = name
  }
  if (body.defaultUnitPrice !== undefined) {
    const price = Number(body.defaultUnitPrice)
    if (!(price >= 0)) return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    data.defaultUnitPrice = price
  }
  if (body.department !== undefined && DEPARTMENT_KEYS.includes(body.department)) data.department = body.department
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.position !== undefined && Number.isFinite(Number(body.position))) data.position = Number(body.position)

  const updated = await prisma.siteTheme.update({ where: { id: theme.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id') ?? ''
  const used = await prisma.generatedSite.count({ where: { themeId: id } })
  if (used > 0) {
    return NextResponse.json(
      { error: `${used} site(s) utilisent ce thème : désactivez-le plutôt que de le supprimer.` },
      { status: 400 },
    )
  }
  await prisma.siteTheme.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
