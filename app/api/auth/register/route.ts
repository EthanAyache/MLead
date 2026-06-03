import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.id || !body.email) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Vérifie si c'est le PREMIER user → on le met admin automatiquement
  const userCount = await prisma.user.count()
  const role = userCount === 0 ? 'ADMIN' : 'USER'

  const user = await prisma.user.create({
    data: {
      id: body.id,
      email: body.email,
      name: body.name || null,
      role,
    },
  })

  return NextResponse.json(user, { status: 201 })
}