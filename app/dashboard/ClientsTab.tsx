'use client'

import Link from 'next/link'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  totalOwed: number
  invoiceCount: number
  hasLate: boolean
  suspended: boolean
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function ClientsTab({ clients }: { clients: Client[] }) {
  return (
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Clients JBOOST
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          {clients.length} client{clients.length > 1 ? 's' : ''} actif{clients.length > 1 ? 's' : ''}.
        </span>
        <Link href="/clients" className="ml-auto h-9 px-3 rounded-lg bg-[#6A4FE6] hover:bg-[#5840CC] text-white text-sm font-semibold flex items-center gap-2 transition shadow-[0_4px_12px_rgba(106,79,230,.25)]">
          <span className="text-base leading-none">+</span> Gérer les clients
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">Aucun client. Rendez-vous sur la page Clients pour en ajouter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Client</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Contact</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Factures impayées</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Solde dû</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">État</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                  <td className="px-5 py-3.5 font-semibold text-[#16171D]">
                    {c.name}
                    {c.suspended && (
                      <span className="badge b-late ml-2 align-middle"><span className="b-dot" />Suspendu</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#414350] text-xs">
                    {c.email ?? '—'}<br />
                    <span className="text-[#787C8A]">{c.phone ?? ''}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#414350] num">{c.invoiceCount}</td>
                  <td className={`px-5 py-3.5 text-right font-bold num ${c.totalOwed > 0 ? 'text-[#D23B3B]' : 'text-[#1F8A53]'}`}>
                    {fmt(c.totalOwed)}
                  </td>
                  <td className="px-5 py-3.5">
                    {c.totalOwed === 0 ? (
                      <span className="badge b-paid"><span className="b-dot" />À jour</span>
                    ) : c.hasLate ? (
                      <span className="badge b-late"><span className="b-dot" />En retard</span>
                    ) : (
                      <span className="badge b-pending"><span className="b-dot" />En attente</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/clients/${c.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9DEFB] text-[#2563EB] text-xs font-semibold hover:bg-[#E3EEFD] transition whitespace-nowrap"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      Campagnes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}