import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getCurrentUser } from '@/lib/auth'

// Diagnostic SMTP (admin only).
//   GET /api/mail-test            -> vérifie que les variables sont présentes + connexion/auth SMTP
//   GET /api/mail-test?to=x@y.fr  -> envoie en plus un vrai e-mail de test
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
  }

  const host = process.env.SMTP_HOST
  const portRaw = process.env.SMTP_PORT
  const port = parseInt(portRaw || '465', 10)
  const u = process.env.SMTP_USER
  const p = process.env.SMTP_PASS

  // Quelles variables l'app voit-elle réellement (sans révéler le mot de passe) ?
  const present = {
    SMTP_HOST: host || null,
    SMTP_PORT: portRaw || null,
    SMTP_USER: u || null,
    SMTP_PASS: p ? '(défini)' : null,
    MAIL_FROM: process.env.MAIL_FROM || null,
  }

  if (!host || !u || !p) {
    return NextResponse.json({
      ok: false,
      step: 'variables',
      present,
      message: "Variables SMTP manquantes : l'app ne les voit pas. Vérifie cPanel → Setup Node.js App → Environment variables, puis redémarre l'app (touch tmp/restart.txt).",
    })
  }

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: u, pass: p } })

  try {
    await transporter.verify()
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'connexion',
      present,
      error: String((e as Error)?.message || e),
      message: "Connexion/authentification SMTP échouée. Vérifie SMTP_HOST, SMTP_PORT et surtout le mot de passe.",
    })
  }

  const to = new URL(request.url).searchParams.get('to')
  if (to) {
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || u,
        to,
        subject: 'Test SMTP — MonsieurLead',
        text: 'Si tu lis ce message, l’envoi SMTP de MonsieurLead fonctionne. ✅',
      })
      return NextResponse.json({ ok: true, step: 'envoi', present, sentTo: to, message: 'E-mail de test envoyé. Vérifie la boîte (et les spams).' })
    } catch (e) {
      return NextResponse.json({ ok: false, step: 'envoi', present, error: String((e as Error)?.message || e), message: "Connexion OK mais l'envoi a échoué." })
    }
  }

  return NextResponse.json({ ok: true, step: 'connexion', present, message: 'Connexion SMTP OK. Ajoute ?to=ton@email.fr pour envoyer un vrai test.' })
}
