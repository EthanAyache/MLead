'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: string; name: string }

export default function AddInvoiceForm({ clients, brands }: { clients: Option[]; brands: Option[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [target, setTarget] = useState<'client' | 'brand'>('client')
  const [targetId, setTargetId] = useState('')
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!number.trim()) e.number = 'Numéro obligatoire (ex: FA-2026-001)'
    if (!targetId) e.targetId = target === 'client' ? 'Choisissez un client' : 'Choisissez une brand'
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Montant invalide'
    if (!dueDate) e.dueDate = 'Date d\'échéance obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number,
        amount,
        currency,
        dueDate,
        clientId: target === 'client' ? targetId : null,
        brandId: target === 'brand' ? targetId : null,
      }),
    })
    setNumber(''); setAmount(''); setTargetId(''); setDueDate(''); setErrors({})
    setIsOpen(false); setLoading(false)
    router.refresh()
  }

  const inputBase = "w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
  const ok = "border-gray-300 focus:ring-blue-500"
  const err = "border-red-400 bg-red-50 focus:ring-red-500"
  const options = target === 'client' ? clients : brands

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
        + Nouvelle facture
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setErrors({}) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Nouvelle facture</h2>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>

              {/* Type de facture : client ou brand */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Type de facture *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTarget('client'); setTargetId('') }}
                    className={`flex-1 h-10 rounded-lg border font-semibold text-sm transition ${
                      target === 'client'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    À émettre (client doit payer)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTarget('brand'); setTargetId('') }}
                    className={`flex-1 h-10 rounded-lg border font-semibold text-sm transition ${
                      target === 'brand'
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    À payer (à une brand)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{target === 'client' ? 'Client' : 'Brand'} *</label>
                <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setErrors({ ...errors, targetId: '' }) }} className={`${inputBase} ${errors.targetId ? err : ok}`}>
                  <option value="">— Choisir —</option>
                  {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {errors.targetId && <p className="text-red-600 text-xs mt-1">⚠ {errors.targetId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Numéro de facture *</label>
                <input value={number} onChange={(e) => { setNumber(e.target.value); setErrors({ ...errors, number: '' }) }} placeholder="FA-2026-001" className={`${inputBase} ${errors.number ? err : ok}`} />
                {errors.number && <p className="text-red-600 text-xs mt-1">⚠ {errors.number}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Montant *</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors({ ...errors, amount: '' }) }} placeholder="1250.00" className={`flex-1 ${inputBase} ${errors.amount ? err : ok}`} />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-gray-900">
                    <option value="EUR">€</option>
                    <option value="ILS">₪</option>
                    <option value="USD">$</option>
                  </select>
                </div>
                {errors.amount && <p className="text-red-600 text-xs mt-1">⚠ {errors.amount}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date d'échéance *</label>
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setErrors({ ...errors, dueDate: '' }) }} className={`${inputBase} ${errors.dueDate ? err : ok}`} />
                {errors.dueDate && <p className="text-red-600 text-xs mt-1">⚠ {errors.dueDate}</p>}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setErrors({}) }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
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