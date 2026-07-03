'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditClientForm from './EditClientForm'

type Client = {
  id: string
  name: string
  companyName: string | null
  siret: string | null
  email: string | null
  phone: string | null
  notifyEmails: string | null
  apporteurId: string | null
  apporteur: { id: string; name: string } | null
}

type Option = { id: string; name: string }

export default function SearchAndList({ clients, apporteurs }: { clients: Client[]; apporteurs: Option[] }) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.siret?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.apporteur?.name.toLowerCase().includes(q)
    )
  })

  return (
    <>
      {/* Barre de recherche */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone ou apporteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-xs"
              title="Effacer"
            >
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} pour « {search} »
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client. Cliquez sur « Nouveau client » pour commencer.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Apporteur</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.apporteur?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/clients/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Campagnes
                      </Link>
                      <EditClientForm
                        client={{ id: c.id, name: c.name, companyName: c.companyName, siret: c.siret, email: c.email, phone: c.phone, notifyEmails: c.notifyEmails, apporteurId: c.apporteurId }}
                        apporteurs={apporteurs}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}