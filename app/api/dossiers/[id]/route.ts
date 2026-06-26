import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateDossierToken } from '@/lib/token'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if (typeof body.active === 'boolean') data.active = body.active
  if ('contractTerms' in body) data.contractTerms = (body.contractTerms ?? '').trim() || null
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
