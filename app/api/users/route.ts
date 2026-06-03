import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — liste tous les utilisateurs (admin only)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

// POST — créer un utilisateur (admin only)
export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()

  if (!body.email || !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: 'Mot de passe : 6 caractères minimum' }, { status: 400 })
  }
  if (!body.role || !['ADMIN', 'USER'].includes(body.role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // 1. Créer le compte côté Supabase Auth (avec la clé service_role qui peut tout faire)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true, // évite l'envoi du mail de confirmation
    user_metadata: { name: body.name || null },
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Erreur création' }, { status: 500 })
  }

  // 2. Créer l'entrée dans notre table User
  const user = await prisma.user.create({
    data: {
      id: data.user.id,
      email: body.email,
      name: body.name || null,
      role: body.role,
    },
  })

  return NextResponse.json(user, { status: 201 })
}