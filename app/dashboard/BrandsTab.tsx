'use client'

import Link from 'next/link'

type Brand = {
  id: string
  name: string
  email: string | null
  totalOwed: number
  invoiceCount: number
  hasLate: boolean
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function BrandsTab({ brands }: { brands: Brand[] }) {
  return (
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96L12 12l8.73-5.04M12 22V12" />
          </svg>
          Balances brands
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          Ce que Mr.Lead doit à ses brands.
        </span>
        <Link href="/brands" className="ml-auto h-9 px-3 rounded-lg bg-[#6A4FE6] hover:bg-[#5840CC] text-white text-sm font-semibold flex items-center gap-2 transition shadow-[0_4px_12px_rgba(106,79,230,.25)]">
          <span className="text-base leading-none">+</span> Gérer les brands
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">Aucune brand enregistrée.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Brand</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Email</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Factures à payer</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Solde à payer</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">État</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                  <td className="px-5 py-3.5 font-semibold text-[#16171D]">{b.name}</td>
                  <td className="px-5 py-3.5 text-[#414350] text-xs">{b.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right text-[#414350] num">{b.invoiceCount}</td>
                  <td className={`px-5 py-3.5 text-right font-bold num ${b.totalOwed > 0 ? 'text-[#D23B3B]' : 'text-[#1F8A53]'}`}>
                    {fmt(b.totalOwed)}
                  </td>
                  <td className="px-5 py-3.5">
                    {b.totalOwed === 0 ? (
                      <span className="badge b-paid"><span className="b-dot" />Soldé</span>
                    ) : b.hasLate ? (
                      <span className="badge b-late"><span className="b-dot" />En retard</span>
                    ) : (
                      <span className="badge b-pending"><span className="b-dot" />À payer</span>
                    )}
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