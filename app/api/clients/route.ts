// =====================================================
//  app/api/clients/route.ts — API des clients
// =====================================================
//  GET  /api/clients  → liste tous les clients
//  POST /api/clients  → crée un nouveau client
// =====================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET → lire la liste
export async function GET() {
  const clients = await prisma.client.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(clients)
}

// POST → créer un client
export async function POST(request: Request) {
  const body = await request.json()

  // Validation simple : le nom est obligatoire
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json(
      { error: 'Le nom est obligatoire' },
      { status: 400 }
    )
  }

  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
    },
  })

  return NextResponse.json(client, { status: 201 })
}