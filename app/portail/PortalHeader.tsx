import Link from 'next/link'

export default function PortalHeader({ clientName }: { clientName: string }) {
  return (
    <header className="border-b border-[#E8E9EF] bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/portail" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6A4FE6] text-sm font-extrabold text-white font-bricolage">M</span>
          <span className="font-bricolage font-extrabold tracking-tight">MonsieurLead</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[160px] truncate text-sm text-[#787C8A] sm:inline">{clientName}</span>
          <form action="/api/portal/logout" method="post">
            <button className="rounded-lg border border-[#DCDDE6] px-3 py-1.5 text-sm font-semibold text-[#414350] transition hover:bg-[#FAFAFC] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6]">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
