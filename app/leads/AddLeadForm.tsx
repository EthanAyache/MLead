'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: string; name: string }

export default function AddLeadForm({ brands, clients }: { brands: Option[]; clients: Option[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [brandId, setBrandId] = useState('')
  const [clientId, setClientId] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyCurrency, setBuyCurrency] = useState('EUR')
  const [sellPrice, setSellPrice] = useState('')
  const [sellCurrency, setSellCurrency] = useState('EUR')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!brandId) e.brandId = 'Choisissez une brand'
    if (!clientId) e.clientId = 'Choisissez un client'
    if (!buyPrice || parseFloat(buyPrice) < 0) e.buyPrice = "Prix d'achat invalide"
    if (!sellPrice || parseFloat(sellPrice) < 0) e.sellPrice = 'Prix de vente invalide'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, clientId, buyPrice, buyCurrency, sellPrice, sellCurrency, label, date }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || "L'enregistrement a échoué. Réessayez.")
        setLoading(false)
        return
      }
    } catch {
      setSubmitError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setLoading(false)
      return
    }
    setBrandId(''); setClientId(''); setBuyPrice(''); setSellPrice(''); setLabel(''); setErrors({})
    setIsOpen(false); setLoading(false)
    router.refresh()
  }

  const inputBase = "w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
  const ok = "border-gray-300 focus:ring-blue-500"
  const err = "border-red-400 bg-red-50 focus:ring-red-500"

  // Calcul marge en live
  const margin = (parseFloat(sellPrice || '0') - parseFloat(buyPrice || '0')).toFixed(2)

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
        + Nouveau lead
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Nouveau lead</h2>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Brand (fournisseur) *</label>
                  <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setErrors({ ...errors, brandId: '' }) }} className={`${inputBase} ${errors.brandId ? err : ok}`}>
                    <option value="">— Choisir —</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.brandId && <p className="text-red-600 text-xs mt-1">⚠ {errors.brandId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Client *</label>
                  <select value={clientId} onChange={(e) => { setClientId(e.target.value); setErrors({ ...errors, clientId: '' }) }} className={`${inputBase} ${errors.clientId ? err : ok}`}>
                    <option value="">— Choisir —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.clientId && <p className="text-red-600 text-xs mt-1">⚠ {errors.clientId}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prix d'achat (brand) *</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={buyPrice} onChange={(e) => { setBuyPrice(e.target.value); setErrors({ ...errors, buyPrice: '' }) }} placeholder="5.00" className={`flex-1 ${inputBase} ${errors.buyPrice ? err : ok}`} />
                    <select value={buyCurrency} onChange={(e) => setBuyCurrency(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-gray-900">
                      <option value="EUR">€</option>
                      <option value="ILS">₪</option>
                      <option value="USD">$</option>
                    </select>
                  </div>
                  {errors.buyPrice && <p className="text-red-600 text-xs mt-1">⚠ {errors.buyPrice}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prix de vente (client) *</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={sellPrice} onChange={(e) => { setSellPrice(e.target.value); setErrors({ ...errors, sellPrice: '' }) }} placeholder="12.00" className={`flex-1 ${inputBase} ${errors.sellPrice ? err : ok}`} />
                    <select value={sellCurrency} onChange={(e) => setSellCurrency(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-gray-900">
                      <option value="EUR">€</option>
                      <option value="ILS">₪</option>
                      <option value="USD">$</option>
                    </select>
                  </div>
                  {errors.sellPrice && <p className="text-red-600 text-xs mt-1">⚠ {errors.sellPrice}</p>}
                </div>
              </div>

              {parseFloat(buyPrice) > 0 && parseFloat(sellPrice) > 0 && buyCurrency === sellCurrency && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <span className="text-gray-700">Marge brute : </span>
                  <span className="font-bold text-blue-700">{margin} {buyCurrency === 'EUR' ? '€' : buyCurrency === 'ILS' ? '₪' : '$'}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Libellé (optionnel)</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Permis de conduire, Casque Apple…" className={`${inputBase} ${ok}`} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputBase} ${ok}`} />
              </div>

              {submitError && <p className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">⚠ {submitError}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}