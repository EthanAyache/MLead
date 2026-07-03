import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { generateDossierToken } from '@/lib/token'
import { DEPARTMENT_KEYS } from '@/lib/departments'

// Récupère un site en vérifiant qu'il appartient au périmètre de l'utilisateur (USER = ses clients, ADMIN = tous).
async function findOwnedDossier(id: string, user: { id: string; role: string }) {
  return prisma.dossier.findFirst({ where: { id, campagne: { client: visibilityFilter(user) } } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedDossier(id, user)
  if (!existing) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.autoAssignJboost === 'boolean') data.autoAssignJboost = body.autoAssignJboost
  if ('contractTerms' in body) data.contractTerms = (body.contractTerms ?? '').trim() || null
  if ('notifyEmails' in body) data.notifyEmails = (body.notifyEmails ?? '').trim() || null
  if (typeof body.department === 'string' && (DEPARTMENT_KEYS as string[]).includes(body.department)) {
    data.department = body.department
  }
  if (body.unitPrice !== undefined) {
    const p = parseFloat(body.unitPrice)
    if (!(p >= 0)) return NextResponse.json({ error: 'Prix unitaire invalide' }, { status: 400 })
    data.unitPrice = p
  }
  // Régénération du token (invalide l'ancien lien API)
  if (body.regenerateToken === true) {
    let token = generateDossierToken()
    while (await prisma.dossier.findUnique({ where: { token } })) {
      token = generateDossierToken()
    }
    data.token = token
  }

  const dossier = await prisma.dossier.update({ where: { id }, data })
  return NextResponse.json(dossier)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Suppression réservée aux administrateurs (cohérent avec la suppression de thème)
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Suppression réservée aux administrateurs' }, { status: 403 })
  }

  const { id } = await params
  const existing = await findOwnedDossier(id, user)
  if (!existing) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  // Garde-fou : on ne supprime pas un dossier dont des leads ont déjà été facturés
  const billed = await prisma.inboundLead.count({ where: { dossierId: id, monthlyInvoiceId: { not: null } } })
  if (billed > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${billed} lead(s) déjà facturé(s) dans ce site.` },
      { status: 409 },
    )
  }

  await prisma.dossier.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
