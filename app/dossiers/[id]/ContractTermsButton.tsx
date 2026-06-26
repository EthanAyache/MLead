'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ContractTermsButton({
  dossierId, terms,
}: {
  dossierId: string
  terms: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(terms ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasTerms = !!(terms && terms.trim())

  async function save() {
    setLoading(true); setError('')
    const res = await fetch(`/api/dossiers/${dossierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractTerms: value }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erreur')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => { setValue(terms ?? ''); setOpen(true) }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
          hasTerms
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
        </svg>
        TERMES DU CONTRAT
        {hasTerms && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setOpen(false); setError('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Termes du contrat</h2>
            <p className="text-xs text-gray-500 mb-4">Conditions convenues avec le client pour ce site (prix, volume, exclusivité, délais…).</p>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={8}
              placeholder="Ex : 8 € par lead valide, facturation le 28 du mois, paiement à réception, leads exclusifs…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {error && <p className="text-red-600 text-sm mt-2">⚠ {error}</p>}
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => { setOpen(false); setError('') }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={save} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
