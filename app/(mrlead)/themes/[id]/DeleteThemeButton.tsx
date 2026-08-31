'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteThemeButton({ themeId, themeName }: { themeId: string; themeName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/themes/${themeId}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erreur lors de la suppression')
      return
    }
    router.push('/themes')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="h-[38px] px-3 rounded-lg border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition flex items-center gap-1.5"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Supprimer
      </button>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setConfirming(false); setError('') }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900">Supprimer ce thème ?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Le thème <strong>« {themeName} »</strong>, ses paliers de remise et tous ses leads <strong>en stock</strong> seront définitivement supprimés. Cette action est irréversible.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Les thèmes dont des leads ont déjà été vendus ne peuvent pas être supprimés.
            </p>
            {error && <p className="text-red-600 text-sm mt-3">⚠ {error}</p>}
            <div className="flex gap-2 justify-end pt-5">
              <button type="button" onClick={() => { setConfirming(false); setError('') }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
              <button type="button" disabled={loading} onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
                {loading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
