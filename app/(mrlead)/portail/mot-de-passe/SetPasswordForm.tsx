'use client'

import { useState } from 'react'
import PortalPasswordInput from '../PortalPasswordInput'

export default function SetPasswordForm({ token }: { token: string }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (pw !== pw2) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/portal/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      })
      if (res.ok) {
        window.location.href = '/portail'
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Une erreur est survenue.')
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="font-bricolage text-2xl font-bold tracking-tight">Choisissez votre mot de passe</h1>
      <p className="mt-1.5 text-sm text-[#787C8A] leading-relaxed">Au moins 8 caractères. Il vous servira à vous connecter à votre espace.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="pw" className="block text-sm font-semibold text-[#414350]">Nouveau mot de passe</label>
          <div className="mt-1.5"><PortalPasswordInput id="pw" value={pw} onChange={(v) => { setPw(v); setError('') }} autoComplete="new-password" /></div>
        </div>
        <div>
          <label htmlFor="pw2" className="block text-sm font-semibold text-[#414350]">Confirmer le mot de passe</label>
          <div className="mt-1.5"><PortalPasswordInput id="pw2" value={pw2} onChange={(v) => { setPw2(v); setError('') }} autoComplete="new-password" /></div>
        </div>
        {error && <p className="text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}
        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#6A4FE6] px-4 font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] focus:ring-offset-2 disabled:opacity-50">
          {loading ? 'Enregistrement…' : 'Enregistrer et me connecter'}
        </button>
      </div>
    </form>
  )
}
