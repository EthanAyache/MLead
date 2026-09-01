import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { generateDossierToken } from '@/lib/token'
import { normalizeUrl } from '@/lib/url'
import { defaultNotifyEmails } from '@/lib/generatedSite'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nom du site obligatoire' }, { status: 400 })
  if (!body.campagneId) return NextResponse.json({ error: 'Campagne obligatoire' }, { status: 400 })

  const campagne = await prisma.campagne.findFirst({
    where: { id: body.campagneId, client: visibilityFilter(user) },
    select: { id: true, client: { select: { email: true } } },
  })
  if (!campagne) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  const unitPrice = parseFloat(body.unitPrice)
  if (!(unitPrice >= 0)) return NextResponse.json({ error: 'Prix unitaire invalide' }, { status: 400 })

  // Token unique (collision quasi impossible, on reboucle par sécurité)
  let token = generateDossierToken()
  while (await prisma.dossier.findUnique({ where: { token } })) {
    token = generateDossierToken()
  }

  const site = await prisma.dossier.create({
    data: {
      name, campagneId: campagne.id, unitPrice, token, websiteUrl: normalizeUrl(body.websiteUrl),
      // Mêmes destinataires par défaut que pour un site créé depuis le portail : l'e-mail du
      // client et la copie JBoost, modifiables ensuite dans les réglages du site.
      notifyEmails: defaultNotifyEmails(campagne.client.email),
    },
  })
  return NextResponse.json(site, { status: 201 })
}
