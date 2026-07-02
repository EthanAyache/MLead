'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type CallRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  receivedAt: string
  clientName: string
  campagneName: string
  siteName: string
  siteId: string
  chosenOfferIds: string[]
  owed: number
  offers: Offer[]
}

type Offer = {
  id: string
  name: string
  commissionType: 'PERCENT' | 'FIXED'
  commissionValue: number
  sellPrice: number
  deposit: number | null
}

function eur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function commissionLabel(o: Offer) {
  return o.commissionType === 'FIXED' ? `${o.commissionValue} €` : `${o.commissionValue} %`
}

// Date locale "AAAA-MM-JJ" pour comparer avec les <input type="date">
function localYMD(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AppelerList({ rows }: { rows: CallRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todo' | 'pris' | 'all'>('todo')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isPris = (r: CallRow) => r.chosenOfferIds.length > 0
  const todoCount = rows.filter((r) => !isPris(r)).length
  const prisCount = rows.filter(isPris).length

  const byFilter = rows.filter((r) => (filter === 'todo' ? !isPris(r) : filter === 'pris' ? isPris(r) : true))
  const q = search.trim().toLowerCase()
  const filtered = byFilter.filter((r) => {
    const ymd = localYMD(r.receivedAt)
    if (dateFrom && ymd < dateFrom) return false
    if (dateTo && ymd > dateTo) return false
    if (q && ![r.name, r.email, r.phone, r.message, r.source, r.clientName, r.campagneName, r.siteName].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
    return true
  })

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

  function toggleOffer(r: CallRow, offerId: string) {
    const next = r.chosenOfferIds.includes(offerId)
      ? r.chosenOfferIds.filter((x) => x !== offerId)
      : [...r.chosenOfferIds, offerId]
    patch(r.id, { chosenOfferIds: next })
  }

  const tabBase = 'px-3.5 h-9 rounded-lg text-sm font-semibold border transition flex items-center gap-2'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setFilter('todo')} className={`${tabBase} ${filter === 'todo' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            À traiter <span className={`text-xs px-1.5 rounded ${filter === 'todo' ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{todoCount}</span>
          </button>
          <button onClick={() => setFilter('pris')} className={`${tabBase} ${filter === 'pris' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            Acceptés <span className={`text-xs px-1.5 rounded ${filter === 'pris' ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{prisCount}</span>
          </button>
          <button onClick={() => setFilter('all')} className={`${tabBase} ${filter === 'all' ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            Tous <span className={`text-xs px-1.5 rounded ${filter === 'all' ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{rows.length}</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <span>Du</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>au</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {(dateFrom || dateTo) && <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="h-7 w-7 rounded-md hover:bg-gray-100 text-gray-400" title="Effacer les dates">✕</button>}
        </div>
        <div className="relative ml-auto w-full sm:w-auto sm:min-w-[280px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, client, site…)" className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          Aucun lead à appeler. Affecte des leads à JBoost depuis la page d&apos;un site pour les retrouver ici.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Aucun lead dans cette vue.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Reçu</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Contact</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Provenance</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Offres prises</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Client doit</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const chosen = r.offers.filter((o) => r.chosenOfferIds.includes(o.id))
              return (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition align-top ${isPris(r) ? 'bg-green-50/40' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.receivedAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.name || '—'}</div>
                    <div className="text-xs space-x-2">
                      {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:underline whitespace-nowrap">{r.phone}</a>}
                      {r.email && <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div className="font-semibold text-gray-800">{r.clientName}</div>
                    <div>{r.campagneName} · <Link href={`/dossiers/${r.siteId}`} className="text-blue-600 hover:underline">{r.siteName}</Link></div>
                  </td>
                  <td className="px-4 py-3">
                    {r.offers.length === 0 ? (
                      <Link href={`/dossiers/${r.siteId}`} className="text-xs text-amber-600 hover:underline">Aucune offre — en créer</Link>
                    ) : (
                      <div className="space-y-1.5 max-w-[300px]">
                        {/* Cases à cocher : les offres prises par le lead */}
                        <div className="flex flex-wrap gap-1.5">
                          {r.offers.map((o) => {
                            const on = r.chosenOfferIds.includes(o.id)
                            return (
                              <button
                                key={o.id}
                                onClick={() => toggleOffer(r, o.id)}
                                disabled={busyId === r.id}
                                className={`px-2 py-1 rounded-full text-xs font-medium border transition disabled:opacity-50 ${on ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                              >
                                {on ? '✓ ' : ''}{o.name}
                              </button>
                            )
                          })}
                        </div>
                        {/* Détail des offres prises (toujours visible) */}
                        {chosen.map((o) => (
                          <div key={o.id} className="bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">{o.name}</span> — Commission <strong>{commissionLabel(o)}</strong> · Vente <strong>{eur(o.sellPrice)}</strong>
                            {o.deposit != null ? <> · Acompte <strong>{eur(o.deposit)}</strong></> : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    {isPris(r) ? <span className="text-green-700">{eur(r.owed)}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isPris(r) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">✓ Accepté</span>
                    ) : (
                      <button onClick={() => patch(r.id, { assignedToJboost: false })} disabled={busyId === r.id} className="text-xs font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-50">↩ Rendre au client</button>
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
