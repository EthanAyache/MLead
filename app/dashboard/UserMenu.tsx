'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

type Props = {
  name: string
  email: string
  role: 'ADMIN' | 'USER'
}

export default function UserMenu({ name, email, role }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Ferme le menu quand on clique en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await signOut({ callbackUrl: '/login' })
  }

  // Initiales pour l'avatar
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-[42px] px-2.5 pl-1.5 rounded-[11px] bg-white/[0.12] border border-white/[0.22] hover:bg-white/20 flex items-center gap-2.5 text-white text-[13.5px] font-semibold transition"
      >
        <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-white to-[#DBE3F5] text-[#1E3A8A] font-extrabold text-[13px] flex items-center justify-center">
          {initials}
        </div>
        <span>{name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* En-tête menu */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="font-semibold text-gray-900 text-sm truncate">{name}</div>
            <div className="text-xs text-gray-500 truncate">{email}</div>
            <div className="mt-1.5">
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {role === 'ADMIN' ? '👑 Admin' : 'Utilisateur'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            {role === 'ADMIN' && (
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Gérer les utilisateurs
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}