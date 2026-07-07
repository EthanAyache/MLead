'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LeadEmailForm({ current }: { current: string }) {
  const router = useRouter()
  const [email, setEmail] = useState(current)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaved(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Adresse e-mail invalide.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/portal/lead-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur'); return }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSaved(false); setError('') }}
          placeholder="vous@entreprise.fr"
          aria-label="E-mail de réception des leads"
          className="h-11 flex-1 rounded-xl border border-[#DCDDE6] bg-white px-3 text-[15px] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]"
        />
        <button type="submit" disabled={busy} className="h-11 shrink-0 rounded-xl bg-[#6A4FE6] px-4 text-sm font-semibold text-white transition hover:bg-[#5840CC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6] disabled:opacity-50">
          {busy ? '…' : 'Enregistrer'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}
      {saved && <p className="mt-2 text-sm text-[#1F8A53]">✓ E-mail de réception enregistré.</p>}
    </form>
  )
}
