import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - récupérer un client par son ID
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  return NextResponse.json(client)
}

// PATCH - modifier un client existant
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const { id } = await params
  await prisma.client.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}