'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type SiteOption = { id: string; label: string }

// Bouton « + Ajouter un lead » + modale. Si le lead existe déjà (même email/téléphone sur le site),
// on affiche un avertissement et on propose d'ajouter quand même.
export default function AddLeadModal({ sites, assignJboost = false }: { sites: SiteOption[]; assignJboost?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dossierId, setDossierId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dupWarn, setDupWarn] = useState(false)

  function reset() {
    setDossierId(''); setName(''); setEmail(''); setPhone(''); setMessage(''); setError(''); setDupWarn(false)
  }
  function close() { setOpen(false); reset() }

  async function submit(force = false) {
    setError('')
    if (!dossierId) { setError('Choisissez un site.'); return }
    if (!name.trim() && !email.trim() && !phone.trim()) { setError('Renseignez au moins un nom, un email ou un téléphone.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/inbound-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId, nom: name, email, telephone: phone, message, assignedToJboost: assignJboost, force }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Erreur'); return }
      if (d.duplicate) { setDupWarn(true); return }
      close()
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-1.5 transition shadow-sm">
        <span className="text-base leading-none">+</span> Ajouter un lead
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Ajouter un lead</h2>

            {dupWarn ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3">
                  ⚠️ <strong>Ce lead existe déjà</strong> sur ce site (même email ou téléphone). Veux-tu quand même l&apos;ajouter ?
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDupWarn(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button onClick={() => submit(true)} disabled={loading} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50">
                    {loading ? '…' : 'Ajouter quand même'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submit(false) }} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Site *</label>
                  <select value={dossierId} onChange={(e) => setDossierId(e.target.value)} className={inputBase}>
                    <option value="">— Choisir un site —</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className={inputBase} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputBase} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" className={inputBase} />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Message (optionnel)" className={inputBase} />
                {assignJboost && <p className="text-[11px] text-violet-600">Ce lead sera affecté à JBoost (à appeler).</p>}
                {error && <p className="text-red-600 text-xs">⚠ {error}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button type="submit" disabled={loading || sites.length === 0} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                    {loading ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>
                {sites.length === 0 && <p className="text-xs text-gray-400">Aucun site disponible. Créez d&apos;abord un client → campagne → site.</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
