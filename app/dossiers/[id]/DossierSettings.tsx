'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DossierSettings({
  dossierId, token, unitPrice, active, isAdmin, origin,
}: {
  dossierId: string
  token: string
  unitPrice: number
  active: boolean
  isAdmin: boolean
  origin: string
}) {
  const router = useRouter()
  const [tok, setTok] = useState(token)
  const [price, setPrice] = useState(String(unitPrice))
  const [isActive, setIsActive] = useState(active)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apiUrl = `${origin}/api/ingest?token=${tok}`

  async function patch(payload: Record<string, unknown>) {
    setBusy(true); setError('')
    const res = await fetch(`/api/dossiers/${dossierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur')
      return null
    }
    return res.json()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Copie impossible, sélectionne le lien manuellement.')
    }
  }

  async function regenerate() {
    if (!confirm('Régénérer le token ? L’ancien lien API cessera immédiatement de fonctionner.')) return
    const d = await patch({ regenerateToken: true })
    if (d?.token) setTok(d.token)
  }

  async function savePrice() {
    const d = await patch({ unitPrice: price })
    if (d) router.refresh()
  }

  async function toggleActive() {
    const next = !isActive
    const d = await patch({ active: next })
    if (d) { setIsActive(next); router.refresh() }
  }

  async function remove() {
    if (!confirm('Supprimer ce dossier et tous ses leads non facturés ? Action irréversible.')) return
    setBusy(true); setError('')
    const res = await fetch(`/api/dossiers/${dossierId}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur lors de la suppression')
      return
    }
    router.push('/dossiers')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Lien API du dossier</h2>

      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-[260px] text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 break-all">{apiUrl}</code>
        <button onClick={copy} className="px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          {copied ? '✓ Copié' : 'Copier'}
        </button>
        <button onClick={regenerate} disabled={busy} className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          Régénérer
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        C’est l’adresse à appeler depuis le formulaire du site client (méthode POST). Le token identifie ce dossier.
      </p>

      <div className="flex flex-wrap items-end gap-5 mt-5 pt-4 border-t border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Prix par lead</label>
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-500 text-sm">€</span>
            <button onClick={savePrice} disabled={busy} className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50">Enregistrer</button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input type="checkbox" checked={isActive} onChange={toggleActive} disabled={busy} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Dossier actif (reçoit les leads)
        </label>

        {isAdmin && (
          <button onClick={remove} disabled={busy} className="ml-auto px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
            Supprimer le dossier
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mt-3">⚠ {error}</p>}
    </div>
  )
}
