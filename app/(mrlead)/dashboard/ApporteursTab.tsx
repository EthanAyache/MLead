'use client'

import Link from 'next/link'

type Apporteur = {
  id: string
  name: string
  email: string | null
  commissionType: string
  commissionValue: number
  clientCount: number
  activeClients: number
  leadCA: number
  commission: number
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function rateLabel(a: Apporteur) {
  return a.commissionType === 'PERCENT' ? `${a.commissionValue} %` : `${a.commissionValue} € / lead`
}

export default function ApporteursTab({ apporteurs }: { apporteurs: Apporteur[] }) {
  return (
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          Apporteurs d&apos;affaires
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          Commission sur le CA des leads de leurs clients, ce mois-ci.
        </span>
        <Link href="/apporteurs" className="ml-auto h-9 px-3 rounded-lg bg-[#6A4FE6] hover:bg-[#5840CC] text-white text-sm font-semibold flex items-center gap-2 transition shadow-[0_4px_12px_rgba(106,79,230,.25)]">
          <span className="text-base leading-none">+</span> Gérer les apporteurs
        </Link>
      </div>

      {apporteurs.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">Aucun apporteur enregistré.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Apporteur</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Taux</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Clients (actifs ce mois)</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">CA leads ce mois</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Commission ce mois</th>
              </tr>
            </thead>
            <tbody>
              {apporteurs.map((a) => (
                <tr key={a.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                  <td className="px-5 py-3.5">
                    <Link href={`/apporteurs/${a.id}`} className="font-semibold text-[#6A4FE6] hover:underline">{a.name}</Link>
                    <div className="text-[#787C8A] text-xs">{a.email ?? '—'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#414350] num">{rateLabel(a)}</td>
                  <td className="px-5 py-3.5 text-right text-[#414350] num">
                    {a.clientCount} <span className="text-[#787C8A]">({a.activeClients} actif{a.activeClients > 1 ? 's' : ''})</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#414350] num">{fmtEur(a.leadCA)}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-[#1F8A53] num">{fmtEur(a.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
