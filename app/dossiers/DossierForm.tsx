'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ttcFromHt, formatEuros, TVA_PERCENT } from '@/lib/tva'

// Formulaire de création d'un SITE (rattaché à une campagne).
export default function DossierForm({ campagne }: { campagne: { id: string; name: string } }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setName(''); setUnitPrice(''); setError('')
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Nom du site obligatoire'); return }
    if (!unitPrice || parseFloat(unitPrice) < 0) { setError('Prix par lead invalide'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campagneId: campagne.id, name, unitPrice }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur lors de la création')
      return
    }
    const created = await res.json()
    reset()
    setIsOpen(false)
    router.push(`/dossiers/${created.id}`)
    router.refresh()
  }

  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
        + Nouveau site
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setError('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Nouveau site</h2>
            <p className="text-xs text-gray-500 mb-4">
              Site (source) de la campagne <strong>{campagne.name}</strong>. Il aura son propre lien API et son prix par lead.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du site *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: site-voyage.fr, Landing été…" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prix par lead (HT) *</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="8.00" className={`flex-1 ${inputBase}`} />
                  <span className="text-gray-500">€ HT / lead</span>
                </div>
                {parseFloat(unitPrice) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    = <strong className="text-gray-700">{formatEuros(ttcFromHt(parseFloat(unitPrice)))} TTC</strong> / lead (TVA {TVA_PERCENT} %)
                  </p>
                )}
              </div>
              {error && <p className="text-red-600 text-sm">⚠ {error}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setError('') }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Création…' : 'Créer le site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
