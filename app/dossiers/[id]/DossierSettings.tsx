'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DossierSettings({
  dossierId, token, unitPrice, active, isAdmin, origin, notifyEmails,
}: {
  dossierId: string
  token: string
  unitPrice: number
  active: boolean
  isAdmin: boolean
  origin: string
  notifyEmails: string
}) {
  const router = useRouter()
  const [tok, setTok] = useState(token)
  const [price, setPrice] = useState(String(unitPrice))
  const [isActive, setIsActive] = useState(active)
  const [emails, setEmails] = useState(notifyEmails)
  const [emailsSaved, setEmailsSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showApi, setShowApi] = useState(false)

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

  async function saveEmails() {
    const d = await patch({ notifyEmails: emails })
    if (d) { setEmailsSaved(true); setTimeout(() => setEmailsSaved(false), 1800); router.refresh() }
  }

  async function toggleActive() {
    const next = !isActive
    const d = await patch({ active: next })
    if (d) { setIsActive(next); router.refresh() }
  }

  async function remove() {
    if (!confirm('Supprimer ce site et tous ses leads non facturés ? Action irréversible.')) return
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Lien API du site</h2>
        <button
          onClick={() => setShowApi((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${showApi ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {showApi ? 'Masquer le lien API' : 'Afficher le lien API'}
        </button>
      </div>

      {showApi && (
        <div className="mt-3">
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
            C’est l’adresse à appeler depuis le formulaire du site client (méthode POST). Le token identifie ce site.
          </p>
        </div>
      )}

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
          Site actif (reçoit les leads)
        </label>

        {isAdmin && (
          <button onClick={remove} disabled={busy} className="ml-auto px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
            Supprimer le site
          </button>
        )}
      </div>

      {/* Transfert e-mail automatique des leads */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Transfert e-mail des leads (destinataires)</label>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={2}
          placeholder="client@exemple.com, copie@jboost.fr  (séparés par virgule, point-virgule ou retour ligne)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2 mt-1.5">
          <button onClick={saveEmails} disabled={busy} className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50">
            {emailsSaved ? '✓ Enregistré' : 'Enregistrer les destinataires'}
          </button>
          <span className="text-xs text-gray-400">Chaque lead valide reçu est transféré à ces adresses. Vide = e-mail du client par défaut.</span>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-3">⚠ {error}</p>}
    </div>
  )
}
