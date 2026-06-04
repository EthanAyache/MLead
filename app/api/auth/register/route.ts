import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mot de passe : 6 caractères minimum." }, { status: 400 })
  }

  // Email déjà pris ?
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 })
  }

  // Premier inscrit → ADMIN, les suivants → USER
  const userCount = await prisma.user.count()
  const role = userCount === 0 ? "ADMIN" : "USER"

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: { name: name || null, email, password: hashed, role },
  })

  return NextResponse.json({ ok: true })
}