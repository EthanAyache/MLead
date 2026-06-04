import { getCurrentUser } from '@/lib/auth'
import UserMenu from './UserMenu'
import LogoLink from './LogoLink'

export default async function Header() {
  const user = await getCurrentUser()

  return (
    <header className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] shadow-[0_4px_18px_rgba(30,58,138,.18)] border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-[1320px] mx-auto px-[22px] py-4 flex items-center gap-[18px]">
        {/* Logo + nom (clic → dashboard + refresh) */}
        <LogoLink />

        {/* Recherche */}
        <div className="ml-[14px] flex-1 max-w-[380px] relative">
          <svg className="absolute left-[13px] top-[11px] w-[18px] h-[18px] text-white/75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un client, une facture…"
            className="w-full h-[42px] bg-white/[0.12] border border-white/[0.22] rounded-[11px] pl-10 pr-3.5 text-sm text-white placeholder:text-white/65 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 hover:bg-white/[0.18] transition"
          />
        </div>

        {/* Notifications + menu utilisateur */}
        <div className="ml-auto flex items-center gap-2.5">
          <button className="relative w-[42px] h-[42px] rounded-[11px] bg-white/[0.12] border border-white/[0.22] hover:bg-white/[0.22] hover:border-white/35 transition flex items-center justify-center text-white" aria-label="Notifications">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span className="absolute top-[9px] right-2.5 w-2 h-2 rounded-full bg-[#FF5A5A] border-2 border-[#2253C6]" />
          </button>

          {user && (
            <UserMenu
              name={user.name || user.email}
              email={user.email}
              role={user.role as 'ADMIN' | 'USER'}
            />
          )}
        </div>
      </div>
    </header>
  )
}