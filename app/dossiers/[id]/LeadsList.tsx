'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: 'VALID' | 'DUPLICATE' | 'REJECTED'
  assignedToJboost: boolean
  receivedAt: string
  billed: boolean
}

const STATUS_BADGE: Record<LeadRow['status'], { label: string; cls: string }> = {
  VALID: { label: 'Valide', cls: 'bg-green-50 text-green-700 border-green-200' },
  DUPLICATE: { label: 'Doublon', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REJECTED: { label: 'Rejeté', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function LeadsList({ rows, clientName }: { rows: LeadRow[]; clientName: string }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'client' | 'jboost'>('client')
  const [busyId, setBusyId] = useState<string | null>(null)

  const assignedCount = rows.filter((r) => r.assignedToJboost).length
  const clientCount = rows.length - assignedCount

  // Vue "client" = leads NON affectés (ce qu'il reste à appeler au client) ;
  // vue "jboost" = uniquement ceux affectés à JBoost (notre liste d'appels).
  const byView = view === 'jboost'
    ? rows.filter((r) => r.assignedToJboost)
    : rows.filter((r) => !r.assignedToJboost)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? byView.filter((r) =>
        [r.name, r.email, r.phone, r.message, r.source].filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    : byView

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id)
    await fetch(`/api/inbound-leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusyId(null)
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement ce doublon ?')) return
    setBusyId(id)
    await fetch(`/api/inbound-leads/${id}`, { method: 'DELETE' })
    setBusyId(null)
    router.refresh()
  }

  const tabBase = 'px-3.5 h-9 rounded-lg text-sm font-semibold border transition flex items-center gap-2'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        {/* Vues : Client / Affectés à JBoost */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('client')}
            className={`${tabBase} ${view === 'client' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {clientName}
            <span className={`text-xs px-1.5 rounded ${view === 'client' ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{clientCount}</span>
          </button>
          <button
            onClick={() => setView('jboost')}
            className={`${tabBase} ${view === 'jboost' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Affectés à JBoost
            <span className={`text-xs px-1.5 rounded ${view === 'jboost' ? 'bg-white/25' : 'bg-violet-100 text-violet-700'}`}>{assignedCount}</span>
          </button>
        </div>

        <div className="relative ml-auto w-full sm:w-auto sm:min-w-[280px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead…"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          Aucun lead reçu pour l&apos;instant. Dès qu&apos;un site enverra un lead sur le lien API, il apparaîtra ici.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          {q
            ? `Aucun lead ne correspond à « ${search} ».`
            : view === 'jboost'
              ? 'Aucun lead affecté à JBoost pour l’instant.'
              : 'Aucun lead à appeler côté client (tous affectés à JBoost).'}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const badge = STATUS_BADGE[r.status]
              return (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition align-top ${r.assignedToJboost ? 'bg-violet-50/40' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.receivedAt).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {r.name || '—'}
                    {r.assignedToJboost && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">JBOOST</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.email
                      ? <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.phone
                      ? <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:underline whitespace-nowrap">{r.phone}</a>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>{badge.label}</span>
                    {r.billed && <span className="ml-1 text-[10px] text-gray-400">facturé</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.billed ? (
                      <span className="text-xs text-gray-400">verrouillé</span>
                    ) : r.status === 'DUPLICATE' ? (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => patch(r.id, { status: 'VALID' })}
                          disabled={busyId === r.id}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          disabled={busyId === r.id}
                          title="Supprimer ce doublon"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        {r.assignedToJboost ? (
                          <button onClick={() => patch(r.id, { assignedToJboost: false })} disabled={busyId === r.id} className="text-xs font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">↩ Rendre au client</button>
                        ) : (
                          <button onClick={() => patch(r.id, { assignedToJboost: true })} disabled={busyId === r.id} className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50">→ Affecter à JBoost</button>
                        )}
                        {r.status === 'REJECTED' ? (
                          <button onClick={() => patch(r.id, { status: 'VALID' })} disabled={busyId === r.id} className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">Réactiver</button>
                        ) : (
                          <button onClick={() => patch(r.id, { status: 'REJECTED' })} disabled={busyId === r.id} className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">Invalider</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
