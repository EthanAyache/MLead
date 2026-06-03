import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await prisma.brand.findUnique({ where: { id } })
  if (!brand) return NextResponse.json({ error: 'Brand introuvable' }, { status: 404 })
  return NextResponse.json(brand)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  if (body.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if ('email' in body) data.email = body.email?.trim() || null
  if ('phone' in body) data.phone = body.phone?.trim() || null

  const brand = await prisma.brand.update({ where: { id }, data })
  return NextResponse.json(brand)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.brand.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}