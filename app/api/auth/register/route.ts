import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const body = await req.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const name = body.name ? String(body.name).trim() : null

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Format d'email invalide." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mot de passe : 6 caractères minimum." }, { status: 400 })
  }

  // Inscription publique fermée : seul le tout premier compte (amorçage) peut être créé ici — il
  // devient ADMIN. Ensuite, les comptes sont créés par un administrateur depuis l'espace Admin.
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    return NextResponse.json(
      { error: "L'inscription est fermée. Contactez un administrateur pour obtenir un compte." },
      { status: 403 },
    )
  }

  // Email déjà pris ? (théorique ici puisque c'est le premier compte, mais on reste défensif)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: { name, email, password: hashed, role: "ADMIN" },
  })

  return NextResponse.json({ ok: true })
}
