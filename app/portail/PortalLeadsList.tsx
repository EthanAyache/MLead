'use client'

import { Fragment, useState } from 'react'
import { prettyFieldLabel } from '@/lib/leadExtra'
import LeadNote from '@/app/components/LeadNote'

export type PortalLeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  extra: Record<string, string> | null
  note: string | null
  receivedAt: string
  siteName: string
}

export default function PortalLeadsList({ rows, showSite = true }: { rows: PortalLeadRow[]; showSite?: boolean }) {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const q = search.trim().toLowerCase()
  const searched = q
    ? rows.filter((r) =>
        [r.name, r.email, r.phone, r.message, r.source, r.siteName, ...(r.extra ? Object.values(r.extra) : [])]
          .filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    : rows
  const filtered = [...searched].sort((a, b) =>
    sortDir === 'desc' ? b.receivedAt.localeCompare(a.receivedAt) : a.receivedAt.localeCompare(b.receivedAt),
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F5] p-3">
        <div className="relative min-w-[180px] flex-1">
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-[#9AA0AE]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead…"
            aria-label="Rechercher un lead"
            className="h-10 w-full rounded-xl border border-[#DCDDE6] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]"
          />
        </div>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#DCDDE6] bg-white px-3 text-sm font-semibold text-[#414350] transition hover:bg-[#FAFAFC]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M9 18h6" /></svg>
          {sortDir === 'desc' ? 'Plus récents' : 'Plus anciens'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[#787C8A]">Aucun lead reçu pour l&apos;instant.</div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#787C8A]">Aucun lead ne correspond à « {search} ».</div>
      ) : (
        <ul className="divide-y divide-[#EEF0F5]">
          {filtered.map((r) => {
            const hasDetails = !!(r.message || (r.extra && Object.keys(r.extra).length) || r.source)
            const open = openId === r.id
            return (
              <Fragment key={r.id}>
                <li className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#16171D]">{r.name || 'Lead sans nom'}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                        {r.email && <a href={`mailto:${r.email}`} className="text-[#6A4FE6] hover:underline">{r.email}</a>}
                        {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-[#6A4FE6] hover:underline">{r.phone}</a>}
                      </div>
                      {showSite && <div className="mt-0.5 text-xs text-[#9AA0AE]">{r.siteName}</div>}
                      {hasDetails && (
                        <button onClick={() => setOpenId(open ? null : r.id)} className="mt-1 text-xs font-semibold text-[#6A4FE6] hover:underline">
                          {open ? '▾ Masquer les détails' : '▸ Détails'}
                        </button>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-[#9AA0AE]" dateTime={r.receivedAt}>
                      {new Date(r.receivedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </time>
                  </div>

                  <LeadNote leadId={r.id} initialNote={r.note} variant="portal" />

                  {open && hasDetails && (
                    <div className="mt-3 rounded-xl border border-[#EEF0F5] bg-[#FAFAFC] p-3.5">
                      {r.message && (
                        <div className="mb-3">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-[#9AA0AE]">Message</div>
                          <div className="whitespace-pre-wrap text-sm text-[#16171D]">{r.message}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                        {r.source && (
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-[#9AA0AE]">Source</div>
                            <div className="break-words text-sm text-[#16171D]">{r.source}</div>
                          </div>
                        )}
                        {r.extra && Object.entries(r.extra).map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-[#9AA0AE]">{prettyFieldLabel(k)}</div>
                            <div className="break-words text-sm text-[#16171D]">{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ul>
      )}
    </div>
  )
}
