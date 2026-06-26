'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: string; name: string }

export default function DossierForm({
  clients = [],
  fixedClient,
}: {
  clients?: Option[]
  fixedClient?: Option
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [clientId, setClientId] = useState(fixedClient?.id ?? '')
  const [name, setName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setClientId(fixedClient?.id ?? ''); setName(''); setUnitPrice(''); setError('')
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const cid = fixedClient?.id ?? clientId
    if (!cid) { setError('Choisis un client'); return }
    if (!name.trim()) { setError('Nom de la campagne obligatoire'); return }
    if (!unitPrice || parseFloat(unitPrice) < 0) { setError('Prix par lead invalide'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid, name, unitPrice }),
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
  const disabled = !fixedClient && clients.length === 0

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Nouvelle campagne
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setError('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Nouvelle campagne</h2>
            <p className="text-xs text-gray-500 mb-4">
              {fixedClient
                ? <>Campagne (source / site) du client <strong>{fixedClient.name}</strong>. Donne-lui un nom et son prix par lead.</>
                : <>À qui appartient cette campagne ? Choisis le client, puis donne un nom à la source (son site) et son prix par lead.</>}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {!fixedClient && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Client (à qui appartient cette campagne) *</label>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputBase}>
                    <option value="">— Choisir le client —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la campagne *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Site assurance-auto.fr, Landing voyage…" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prix par lead *</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="8.00" className={`flex-1 ${inputBase}`} />
                  <span className="text-gray-500">€ / lead</span>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">⚠ {error}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setError('') }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Création…' : 'Créer la campagne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
