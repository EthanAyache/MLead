'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Note libre partagée sur un lead (admin ↔ client). Affiche la note et permet de l'éditer.
export default function LeadNote({
  leadId, initialNote, variant = 'admin',
}: {
  leadId: string
  initialNote: string | null
  variant?: 'admin' | 'portal'
}) {
  const router = useRouter()
  const [saved, setSaved] = useState((initialNote ?? '').trim())
  const [note, setNote] = useState(saved)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const url = variant === 'portal' ? '/api/portal/lead-note' : `/api/inbound-leads/${leadId}`
    const method = variant === 'portal' ? 'POST' : 'PATCH'
    const bodyObj = variant === 'portal' ? { leadId, note } : { note }
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) })
      if (res.ok) { setSaved(note.trim()); setEditing(false); router.refresh() }
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="mt-1">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Votre note sur ce lead…"
          className="w-full rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="mt-1 flex gap-2">
          <button onClick={save} disabled={busy} className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">{busy ? '…' : 'Enregistrer'}</button>
          <button onClick={() => { setNote(saved); setEditing(false) }} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        <div className="min-w-0 flex-1">
          <div className="whitespace-pre-wrap text-sm text-[#7c5a10]">{saved}</div>
          <button onClick={() => setEditing(true)} className="mt-0.5 text-xs font-semibold text-amber-700 hover:underline">Modifier</button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      Ajouter une note
    </button>
  )
}
