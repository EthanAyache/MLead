'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditClientForm from './EditClientForm'

type Option = { id: string; name: string }

type Client = {
  id: string
  name: string
  companyName: string | null
  siret: string | null
  email: string | null
  phone: string | null
  notifyEmails: string | null
  apporteurId: string | null
  apporteur: Option | null
  categories: Option[]
}

export default function SearchAndList({ clients, apporteurs, categories }: { clients: Client[]; apporteurs: Option[]; categories: Option[] }) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const filtered = clients.filter(c => {
    if (categoryId === '__none__' && c.categories.length > 0) return false
    if (categoryId && categoryId !== '__none__' && !c.categories.some(cat => cat.id === categoryId)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.siret?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.apporteur?.name.toLowerCase().includes(q) ||
      c.categories.some(cat => cat.name.toLowerCase().includes(q))
    )
  })

  const filtering = search.trim() || categoryId

  return (
    <>
      {/* Barre de recherche + filtre catégorie */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone, apporteur ou catégorie..."
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
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            <option value="__none__">Sans catégorie</option>
          </select>
        </div>
        {filtering && (
          <p className="text-xs text-gray-500 mt-2">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}{search.trim() ? ` pour « ${search} »` : ''}
          </p>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {filtering ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client. Cliquez sur « Nouveau client » pour commencer.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Catégorie</th>
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
                  <td className="px-4 py-3">
                    {c.categories.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.categories.map(cat => (
                          <span key={cat.id} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone ?? '—'}</td>
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
                        client={{ id: c.id, name: c.name, companyName: c.companyName, siret: c.siret, email: c.email, phone: c.phone, notifyEmails: c.notifyEmails, apporteurId: c.apporteurId, categoryIds: c.categories.map(cat => cat.id) }}
                        apporteurs={apporteurs}
                        categories={categories}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  )
}
