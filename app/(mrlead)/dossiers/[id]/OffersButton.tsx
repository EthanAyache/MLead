'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type OfferRow = {
  id: string
  name: string
  commissionType: 'PERCENT' | 'FIXED'
  commissionValue: number
  sellPrice: number
  deposit: number | null
}

function commissionLabel(o: OfferRow) {
  return o.commissionType === 'FIXED' ? `${o.commissionValue} €` : `${o.commissionValue} %`
}

// Bouton « Offres » : gère les offres/contrats commerciaux d'un site (ajout, liste, suppression).
export default function OffersButton({
  dossierId, offers,
}: {
  dossierId: string
  offers: OfferRow[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Formulaire d'ajout
  const [name, setName] = useState('')
  const [commissionType, setCommissionType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [commissionValue, setCommissionValue] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [deposit, setDeposit] = useState('')

  function resetForm() {
    setName(''); setCommissionType('PERCENT'); setCommissionValue(''); setSellPrice(''); setDeposit(''); setError('')
  }

  async function addOffer(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Nom du contrat obligatoire'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId, name, commissionType, commissionValue: commissionValue || 0, sellPrice: sellPrice || 0, deposit }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur')
      return
    }
    resetForm()
    router.refresh()
  }

  async function removeOffer(id: string) {
    if (!confirm('Supprimer cette offre ?')) return
    setLoading(true)
    await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  const hasOffers = offers.length > 0
  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  return (
    <>
      <button
        onClick={() => { resetForm(); setOpen(true) }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
          hasOffers ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        OFFRES
        {hasOffers && <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded bg-emerald-500 text-white text-[10px]">{offers.length}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Offres du site</h2>
            <p className="text-xs text-gray-500 mb-4">Définis une ou plusieurs offres pour ce site. Quand un lead accepte (liste « À appeler »), on choisit l&apos;offre qu&apos;il a prise.</p>

            {/* Offres existantes */}
            {hasOffers && (
              <div className="space-y-2 mb-5">
                {offers.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{o.name}</div>
                      <div className="text-xs text-gray-500">
                        Commission {commissionLabel(o)} · Vente {o.sellPrice} €{o.deposit != null ? ` · Acompte ${o.deposit} €` : ''}
                      </div>
                    </div>
                    <button onClick={() => removeOffer(o.id)} disabled={loading} className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Ajout d'une offre */}
            <form onSubmit={addOffer} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="text-xs font-bold text-gray-500 uppercase">Ajouter une offre</div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du contrat *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Offre standard, Premium…" className={inputBase} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commission</label>
                  <div className="flex gap-1.5">
                    <input type="number" step="0.01" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} placeholder="10" className={`flex-1 ${inputBase}`} />
                    <select value={commissionType} onChange={(e) => setCommissionType(e.target.value as 'PERCENT' | 'FIXED')} className="border border-gray-300 rounded-lg px-2 text-gray-900 text-sm">
                      <option value="PERCENT">%</option>
                      <option value="FIXED">€</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prix de vente (€)</label>
                  <input type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00" className={inputBase} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Acompte (€, optionnel)</label>
                <input type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="laisser vide si aucun" className={inputBase} />
              </div>
              {error && <p className="text-red-600 text-sm">⚠ {error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Fermer</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? '…' : 'Ajouter l’offre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
