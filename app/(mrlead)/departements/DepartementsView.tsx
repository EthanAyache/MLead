'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DEPARTMENTS, DEPARTMENT_LABEL } from '@/lib/departments'

export type SiteRow = {
  id: string
  name: string
  department: string
  active: boolean
  clientName: string
  campagneName: string
  leadCount: number
}

export default function DepartementsView({ rows }: { rows: SiteRow[] }) {
  const [dept, setDept] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const countByDept = (k: string) => rows.filter((r) => r.department === k).length
  const q = search.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    if (dept !== 'ALL' && r.department !== dept) return false
    if (q && ![r.name, r.clientName, r.campagneName].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
    return true
  })

  const tab = (key: string, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setDept(key)}
      className={`px-3.5 h-9 rounded-lg text-sm font-semibold border transition flex items-center gap-2 ${dept === key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
    >
      {label} <span className={`text-xs px-1.5 rounded ${dept === key ? 'bg-white/25' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
    </button>
  )

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {tab('ALL', 'Tous', rows.length)}
        {DEPARTMENTS.map((d) => tab(d.key, d.label, countByDept(d.key)))}
      </div>

      <div className="relative max-w-md mb-5">
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un site, un client, une campagne…" className="w-full h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
          Aucun site {dept !== 'ALL' ? `dans « ${DEPARTMENT_LABEL[dept] ?? dept} »` : ''}{q ? ` pour « ${search} »` : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <Link key={r.id} href={`/dossiers/${r.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">{DEPARTMENT_LABEL[r.department] ?? r.department}</span>
                {!r.active && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Inactif</span>}
              </div>
              <div className="font-bold text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.clientName} · {r.campagneName}</div>
              <div className="text-xs text-gray-400 mt-1.5">{r.leadCount} lead{r.leadCount > 1 ? 's' : ''}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
