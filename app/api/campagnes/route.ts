import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Crée une campagne (regroupement de sites) pour un client.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nom de la campagne obligatoire' }, { status: 400 })
  if (!body.clientId) return NextResponse.json({ error: 'Client obligatoire' }, { status: 400 })

  const client = await prisma.client.findUnique({ where: { id: body.clientId } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const campagne = await prisma.campagne.create({
    data: { name, clientId: body.clientId },
  })
  return NextResponse.json(campagne, { status: 201 })
}
