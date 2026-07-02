import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère un client en vérifiant qu'il appartient au périmètre de l'utilisateur (USER = les siens, ADMIN = tous).
async function findOwnedClient(id: string, user: { id: string; role: string }) {
  return prisma.client.findFirst({ where: { id, ...visibilityFilter(user) } })
}

// GET - récupérer un client par son ID
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const client = await findOwnedClient(id, user)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  return NextResponse.json(client)
}

// PATCH - modifier un client existant
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedClient(id, user)
  if (!existing) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const body = await request.json()

  // Validation
  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if ('email' in body) data.email = body.email?.trim() || null
  if ('phone' in body) data.phone = body.phone?.trim() || null
  if ('notifyEmails' in body) data.notifyEmails = body.notifyEmails?.trim() || null
  if ('apporteurId' in body) data.apporteurId = body.apporteurId || null

  const client = await prisma.client.update({ where: { id }, data })
  return NextResponse.json(client)
}

// DELETE - archiver un client (on garde l'historique, on ne supprime pas vraiment)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedClient(id, user)
  if (!existing) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  await prisma.client.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
