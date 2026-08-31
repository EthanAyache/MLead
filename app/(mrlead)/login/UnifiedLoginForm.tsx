'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import PortalPasswordInput from '@/app/(mrlead)/portail/PortalPasswordInput'

export default function UnifiedLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sous-formulaire client « première connexion / mot de passe oublié »
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // 1) Tentative ADMIN (NextAuth). Si l'e-mail correspond à un compte admin/collaborateur.
      const admin = await signIn('credentials', { email: email.trim(), password, redirect: false })
      if (!admin?.error) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // 2) Sinon, tentative CLIENT (portail).
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        window.location.href = '/portail'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.code === 'NO_PASSWORD') {
        setForgotOpen(true)
        setForgotEmail(email.trim())
        setError('Première connexion : définissez votre mot de passe ci-dessous.')
      } else {
        setError('E-mail ou mot de passe incorrect.')
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault()
    const addr = (forgotEmail || email).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return
    setForgotLoading(true)
    try {
      await fetch('/api/portal/request-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      })
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-bricolage text-2xl font-bold tracking-tight">Connexion</h1>
      <p className="mt-1.5 text-sm text-[#787C8A] leading-relaxed">Accédez à votre espace avec votre e-mail et votre mot de passe.</p>

      <form onSubmit={login} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#414350]">Adresse e-mail</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="vous@exemple.fr" className="mt-1.5 h-12 w-full rounded-xl border border-[#DCDDE6] bg-white px-4 text-[15px] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-[#414350]">Mot de passe</label>
            <button type="button" onClick={() => { setForgotOpen((v) => !v); setForgotSent(false) }} className="text-xs font-semibold text-[#6A4FE6] hover:underline">
              Première connexion / oublié ?
            </button>
          </div>
          <div className="mt-1.5">
            <PortalPasswordInput id="password" value={password} onChange={(v) => { setPassword(v); setError('') }} autoComplete="current-password" />
          </div>
        </div>

        {error && <p className="text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}

        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#6A4FE6] px-4 font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] focus:ring-offset-2 disabled:opacity-50">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      {forgotOpen && (
        <div className="mt-5 rounded-xl border border-[#E8E9EF] bg-[#FAFAFC] p-4">
          {forgotSent ? (
            <p className="text-sm text-[#1F8A53]">✓ Si un compte client existe pour cette adresse, un lien vient d&apos;être envoyé pour définir votre mot de passe (valable 30 min).</p>
          ) : (
            <form onSubmit={requestLink}>
              <p className="text-sm font-semibold text-[#414350]">Espace client — première connexion ou mot de passe oublié</p>
              <p className="mt-1 text-xs text-[#787C8A]">Entrez votre e-mail : nous vous envoyons un lien pour créer votre mot de passe. (Réservé aux comptes clients.)</p>
              <div className="mt-2.5 flex gap-2">
                <input type="email" inputMode="email" autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="vous@entreprise.fr" className="h-11 flex-1 rounded-xl border border-[#DCDDE6] bg-white px-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]" />
                <button type="submit" disabled={forgotLoading} className="h-11 shrink-0 rounded-xl bg-[#6A4FE6] px-4 text-sm font-semibold text-white hover:bg-[#5840CC] disabled:opacity-50">
                  {forgotLoading ? '…' : 'Envoyer'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
