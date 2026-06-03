'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/app/components/PasswordInput'

type User = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  isMe: boolean
}

export default function UsersTable({ users }: { users: User[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Erreur')
      return
    }
    setName(''); setEmail(''); setPassword(''); setRole('USER')
    setShowAdd(false)
    router.refresh()
  }

  async function changeRole(id: string, newRole: 'ADMIN' | 'USER') {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    router.refresh()
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Supprimer définitivement le compte ${email} ? Cette action est irréversible.`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nouvel utilisateur
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bricolage text-xl font-bold mb-4 text-gray-900">Créer un utilisateur</h2>
            <form onSubmit={handleAdd} className="space-y-3" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom complet</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" autoComplete="off" className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jean@exemple.com" autoComplete="off" className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mot de passe *</label>
                <PasswordInput value={password} onChange={setPassword} placeholder="6 caractères minimum" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rôle</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRole('USER')} className={`flex-1 h-10 rounded-lg border font-semibold text-sm ${role === 'USER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                    Utilisateur
                  </button>
                  <button type="button" onClick={() => setRole('ADMIN')} className={`flex-1 h-10 rounded-lg border font-semibold text-sm ${role === 'ADMIN' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-300 text-gray-700'}`}>
                    👑 Admin
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">⚠ {error}</div>}

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04)] overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-[#787C8A] text-sm">Aucun utilisateur.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Nom</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Email</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Rôle</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Créé le</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                  <td className="px-5 py-3.5 font-semibold text-[#16171D]">
                    {u.name || '—'}
                    {u.isMe && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">Vous</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#414350]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    {u.isMe ? (
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'ADMIN' ? '👑 Admin' : 'Utilisateur'}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as 'ADMIN' | 'USER')}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
                      >
                        <option value="USER">Utilisateur</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#787C8A] text-xs">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3.5 text-right">
                    {!u.isMe && (
                      <button onClick={() => deleteUser(u.id, u.email)} className="text-red-600 hover:text-red-800 text-sm font-semibold">
                        Supprimer
                      </button>
                    )}
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