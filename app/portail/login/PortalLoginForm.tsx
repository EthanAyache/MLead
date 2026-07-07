'use client'

import { useState } from 'react'

export default function PortalLoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(initialError ? 'Ce lien est invalide ou expiré. Redemandez-en un.' : '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse e-mail invalide.')
      return
    }
    setLoading(true)
    try {
      await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" /></svg>
        </div>
        <h1 className="font-bricolage text-xl font-bold">Vérifiez vos e-mails</h1>
        <p className="mt-2 text-sm text-[#787C8A] leading-relaxed">
          Si un compte existe pour <strong className="text-[#16171D]">{email.trim()}</strong>, un lien de connexion vient de vous être envoyé. Il est valable 30 minutes.
        </p>
        <button onClick={() => { setSent(false); setEmail('') }} className="mt-5 text-sm font-semibold text-[#6A4FE6] hover:underline">
          Utiliser une autre adresse
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="font-bricolage text-2xl font-bold tracking-tight">Votre espace client</h1>
      <p className="mt-1.5 text-sm text-[#787C8A] leading-relaxed">
        Entrez votre e-mail : nous vous envoyons un lien de connexion sécurisé, sans mot de passe.
      </p>

      <label htmlFor="email" className="mt-6 block text-sm font-semibold text-[#414350]">Adresse e-mail</label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError('') }}
        placeholder="vous@entreprise.fr"
        className="mt-1.5 h-12 w-full rounded-xl border border-[#DCDDE6] bg-white px-4 text-[15px] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]"
      />
      {error && <p className="mt-2 text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#6A4FE6] px-4 font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Envoi…' : 'Recevoir mon lien'}
      </button>

      <p className="mt-4 text-center text-xs text-[#9AA0AE]">Connexion réservée aux clients MonsieurLead.</p>
    </form>
  )
}
