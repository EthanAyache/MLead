'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type ClientHit = { id: string; name: string }
type LeadHit = { id: string; name: string; siteId: string; clientName: string; campagneName: string; siteName: string }

export default function SearchBar() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<ClientHit[]>([])
  const [leads, setLeads] = useState<LeadHit[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onChange(v: string) {
    setQ(v)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 2) {
      setClients([]); setLeads([]); setOpen(false)
      return
    }
    setOpen(true)
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`)
        const d = await res.json()
        setClients(d.clients || [])
        setLeads(d.leads || [])
      } catch {
        setClients([]); setLeads([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  function go(href: string) {
    setOpen(false); setQ(''); setClients([]); setLeads([])
    router.push(href)
  }

  const hasResults = clients.length > 0 || leads.length > 0

  return (
    <div className="ml-[14px] flex-1 max-w-[380px] relative">
      <svg className="absolute left-[13px] top-[11px] w-[18px] h-[18px] text-white/75 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (q.trim().length >= 2) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher un client, un lead…"
        className="w-full h-[42px] bg-white/[0.12] border border-white/[0.22] rounded-[11px] pl-10 pr-3.5 text-sm text-white placeholder:text-white/65 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 hover:bg-white/[0.18] transition"
      />

      {open && (
        <div className="absolute top-[48px] left-0 right-0 bg-white rounded-xl shadow-[0_12px_40px_rgba(20,22,30,.18)] border border-gray-200 max-h-[380px] overflow-auto z-50 py-1">
          {loading && <div className="px-4 py-3 text-gray-400 text-sm">Recherche…</div>}
          {!loading && !hasResults && <div className="px-4 py-3 text-gray-400 text-sm">Aucun résultat pour « {q} ».</div>}

          {clients.length > 0 && (
            <div className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Clients</div>
          )}
          {clients.map((c) => (
            <button key={c.id} onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/clients/${c.id}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 whitespace-nowrap">Client :</span>
              <span className="text-gray-900 font-medium">{c.name}</span>
            </button>
          ))}

          {leads.length > 0 && (
            <div className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Leads</div>
          )}
          {leads.map((l) => (
            <button key={l.id} onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/dossiers/${l.siteId}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
              <span className="text-xs font-bold text-violet-600 whitespace-nowrap">Lead :</span>{' '}
              <span className="text-gray-400 text-xs">{l.clientName} / {l.campagneName} / {l.siteName} / </span>
              <span className="text-gray-900 font-medium">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
