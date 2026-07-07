'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEPARTMENTS } from '@/lib/departments'
import { ttcFromHt, formatEuros, TVA_PERCENT } from '@/lib/tva'

type Extra = { label: string; email: string }

// Lit le champ notifyEmails (JSON [{label,email}] ou ancien texte) → { client, jboost, extras }
function parseEmails(raw: string): { client: string; jboost: string; extras: Extra[] } {
  const s = (raw || '').trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s) as Extra[]
      if (Array.isArray(arr)) {
        const find = (l: string) => arr.find((e) => e?.label === l)?.email ?? ''
        const extras = arr
          .filter((e) => e?.label !== 'Mail client' && e?.label !== 'Mail JBoost')
          .map((e) => ({ label: e?.label || '', email: e?.email || '' }))
        return { client: find('Mail client'), jboost: find('Mail JBoost'), extras }
      }
    } catch {
      // retombe sur le texte
    }
  }
  const list = s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)
  return { client: list[0] || '', jboost: list[1] || '', extras: list.slice(2).map((email) => ({ label: '', email })) }
}

export default function DossierSettings({
  dossierId, token, unitPrice, active, autoAssignJboost, websiteUrl, billingMode, isAdmin, origin, notifyEmails, department,
}: {
  dossierId: string
  token: string
  unitPrice: number
  active: boolean
  autoAssignJboost: boolean
  websiteUrl: string
  billingMode: 'MONTHLY' | 'PREPAID'
  isAdmin: boolean
  origin: string
  notifyEmails: string
  department: string
}) {
  const router = useRouter()
  const [tok, setTok] = useState(token)
  const [price, setPrice] = useState(String(unitPrice))
  const [mode, setMode] = useState(billingMode)
  const [isActive, setIsActive] = useState(active)
  const [autoJboost, setAutoJboost] = useState(autoAssignJboost)
  const [web, setWeb] = useState(websiteUrl)
  const [webSaved, setWebSaved] = useState(false)
  const [dept, setDept] = useState(department)
  const initEmails = parseEmails(notifyEmails)
  const [clientMail, setClientMail] = useState(initEmails.client)
  const [jboostMail, setJboostMail] = useState(initEmails.jboost)
  const [extras, setExtras] = useState<Extra[]>(initEmails.extras)
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

  async function changeMode(next: 'MONTHLY' | 'PREPAID') {
    setMode(next)
    const d = await patch({ billingMode: next })
    if (d) router.refresh()
  }

  async function saveWeb() {
    const d = await patch({ websiteUrl: web })
    if (d) { setWebSaved(true); setTimeout(() => setWebSaved(false), 1800); router.refresh() }
  }

  async function changeDept(value: string) {
    setDept(value)
    const d = await patch({ department: value })
    if (d) router.refresh()
  }

  async function saveEmails() {
    const arr: Extra[] = []
    if (clientMail.trim()) arr.push({ label: 'Mail client', email: clientMail.trim() })
    if (jboostMail.trim()) arr.push({ label: 'Mail JBoost', email: jboostMail.trim() })
    for (const x of extras) {
      if (x.email.trim()) arr.push({ label: x.label.trim() || 'Autre', email: x.email.trim() })
    }
    const d = await patch({ notifyEmails: JSON.stringify(arr) })
    if (d) { setEmailsSaved(true); setTimeout(() => setEmailsSaved(false), 1800); router.refresh() }
  }

  function updateExtra(i: number, field: keyof Extra, value: string) {
    setExtras(extras.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)))
  }

  async function toggleActive() {
    const next = !isActive
    const d = await patch({ active: next })
    if (d) { setIsActive(next); router.refresh() }
  }

  async function toggleAutoJboost() {
    const next = !autoJboost
    const d = await patch({ autoAssignJboost: next })
    if (d) { setAutoJboost(next); router.refresh() }
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
          <label className="block text-xs font-semibold text-gray-700 mb-1">Prix par lead (HT)</label>
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-500 text-sm">€ HT</span>
            <button onClick={savePrice} disabled={busy} className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50">Enregistrer</button>
          </div>
          {parseFloat(price) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              = <strong className="text-gray-700">{formatEuros(ttcFromHt(parseFloat(price)))} TTC</strong> (TVA {TVA_PERCENT} %)
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Formule</label>
          <select value={mode} onChange={(e) => changeMode(e.target.value as 'MONTHLY' | 'PREPAID')} disabled={busy} className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            <option value="MONTHLY">Mensuel</option>
            <option value="PREPAID">Prépayé (solde)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Département</label>
          <select value={dept} onChange={(e) => changeDept(e.target.value)} disabled={busy} className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
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

      {/* Lien du site */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Lien du site</label>
        <div className="flex flex-wrap items-center gap-2">
          <input type="url" value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://mon-site.fr" className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={saveWeb} disabled={busy} className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50">
            {webSaved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
          {web.trim() && (
            <a href={web} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 inline-flex items-center gap-1.5">
              Ouvrir ↗
            </a>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Le lien devient cliquable depuis le titre du site.</p>
      </div>

      {/* Attribution automatique des nouveaux leads à JBoost */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs font-bold text-gray-700 uppercase">Attribuer les nouveaux leads à JBoost</div>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xl">
              {autoJboost
                ? 'Activé : chaque nouveau lead reçu est affecté à JBoost (rappelé par JBoost, exclu de la facture du client). Les leads déjà reçus ne changent pas.'
                : 'Désactivé : les nouveaux leads vont au client normalement. Activez pour que JBoost rappelle les prochains leads (les anciens ne bougent pas).'}
            </p>
          </div>
          <button
            onClick={toggleAutoJboost}
            disabled={busy}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
              autoJboost
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {autoJboost ? '✓ Attribué à JBoost — Désactiver' : 'Attribuer à JBoost'}
          </button>
        </div>
      </div>

      {/* Transfert e-mail automatique des leads */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="text-xs font-bold text-gray-700 uppercase mb-2">Transfert e-mail des leads</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mail client</label>
            <input type="email" value={clientMail} onChange={(e) => setClientMail(e.target.value)} placeholder="client@exemple.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mail JBoost</label>
            <input type="email" value={jboostMail} onChange={(e) => setJboostMail(e.target.value)} placeholder="copie@jboost.fr" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {extras.map((x, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Libellé</label>
              <input value={x.label} onChange={(e) => updateExtra(i, 'label', e.target.value)} placeholder="Ex: Secrétariat" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mail de réception</label>
                <input type="email" value={x.email} onChange={(e) => updateExtra(i, 'email', e.target.value)} placeholder="autre@exemple.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="button" onClick={() => setExtras(extras.filter((_, idx) => idx !== i))} className="h-[38px] px-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm">✕</button>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button type="button" onClick={() => setExtras([...extras, { label: '', email: '' }])} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Ajouter un mail de réception</button>
          <button onClick={saveEmails} disabled={busy} className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-50">
            {emailsSaved ? '✓ Enregistré' : 'Enregistrer les destinataires'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Chaque lead valide est transféré à ces adresses. Tout vide = e-mail du client par défaut.</p>
      </div>

      {error && <p className="text-red-600 text-sm mt-3">⚠ {error}</p>}
    </div>
  )
}
