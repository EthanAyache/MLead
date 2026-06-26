import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateDossierToken } from '@/lib/token'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nom du dossier obligatoire' }, { status: 400 })
  if (!body.clientId) return NextResponse.json({ error: 'Client obligatoire' }, { status: 400 })

  const client = await prisma.client.findUnique({ where: { id: body.clientId } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const unitPrice = parseFloat(body.unitPrice)
  if (!(unitPrice >= 0)) return NextResponse.json({ error: 'Prix unitaire invalide' }, { status: 400 })

  // Token unique (collision quasi impossible, on reboucle par sécurité)
  let token = generateDossierToken()
  while (await prisma.dossier.findUnique({ where: { token } })) {
    token = generateDossierToken()
  }

  const dossier = await prisma.dossier.create({
    data: { name, clientId: body.clientId, unitPrice, token },
  })
  return NextResponse.json(dossier, { status: 201 })
}
