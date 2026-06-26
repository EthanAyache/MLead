'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Formulaire de création d'une CAMPAGNE (regroupement de sites) pour un client.
export default function CampagneForm({ client }: { client: { id: string; name: string } }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Nom de la campagne obligatoire'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/campagnes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, name }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur lors de la création')
      return
    }
    const created = await res.json()
    setName(''); setError(''); setIsOpen(false)
    router.push(`/campagnes/${created.id}`)
    router.refresh()
  }

  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
        + Nouvelle campagne
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setError('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Nouvelle campagne</h2>
            <p className="text-xs text-gray-500 mb-4">
              Campagne du client <strong>{client.name}</strong>. Elle regroupera un ou plusieurs sites (chaque site a son lien API).
            </p>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la campagne *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Voyages, Assurance auto…" className={inputBase} />
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
