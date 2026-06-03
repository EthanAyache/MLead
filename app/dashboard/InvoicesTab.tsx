'use client'

import type { FilterValue } from './QuiDoitAQuiFilter'
import InvoiceActions from './InvoiceActions'

type Invoice = {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  dueDate: string
  clientId: string | null
  brandId: string | null
  stripeInvoiceId: string | null
  client: { id: string; name: string } | null
  brand: { id: string; name: string } | null
}

function symbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

function fmt(amount: number, currency: string) {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol(currency)
}

function daysLate(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

export default function InvoicesTab({ invoices, filter }: { invoices: Invoice[]; filter: FilterValue }) {
  const filtered = invoices.filter(inv => {
    const debtorIsClient = !!inv.clientId
    const creditorIsBrand = !!inv.brandId
    const creditorIsUser = !!inv.clientId

    if (filter.debtorType === 'client' && !debtorIsClient) return false
    if (filter.debtorType === 'user' && !inv.brandId) return false
    if (filter.debtorType === 'brand' || filter.debtorType === 'apporteur') return false

    if (filter.creditorType === 'brand' && !creditorIsBrand) return false
    if (filter.creditorType === 'user' && !creditorIsUser) return false
    if (filter.creditorType === 'client' || filter.creditorType === 'apporteur') return false

    if (filter.debtorName) {
      const name = (inv.client?.name || inv.brand?.name || '').toLowerCase()
      if (!name.includes(filter.debtorName.toLowerCase())) return false
    }
    return true
  })

  const summary = new Map<string, { name: string; type: 'client' | 'brand'; total: number; currency: string; count: number; hasLate: boolean }>()
  for (const inv of filtered) {
    if (inv.status === 'PAID' || inv.status === 'CANCELLED') continue
    const key = inv.clientId ? `client-${inv.clientId}` : `brand-${inv.brandId}`
    const name = inv.client?.name ?? inv.brand?.name ?? '—'
    const type = inv.clientId ? 'client' : 'brand'
    const existing = summary.get(key)
    if (existing) {
      existing.total += inv.amount
      existing.count += 1
      if (inv.status === 'LATE') existing.hasLate = true
    } else {
      summary.set(key, { name, type, total: inv.amount, currency: inv.currency, count: 1, hasLate: inv.status === 'LATE' })
    }
  }

  const summaryRows = Array.from(summary.values()).sort((a, b) => b.total - a.total)
  const unpaid = filtered.filter(i => i.status === 'PENDING' || i.status === 'LATE')

  return (
    <div className="space-y-[18px]">
      <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
        <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
          <h2 className="title-badge font-bricolage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
            Synthèse par destinataire
          </h2>
          <span className="text-[#787C8A] text-[13px] font-medium">
            Soldes nets dus, regroupés par client ou brand.
          </span>
        </div>

        {summaryRows.length === 0 ? (
          <div className="p-12 text-center text-[#787C8A] text-sm">Aucune dette ouverte avec ce filtre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
                <tr>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Destinataire</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Type</th>
                  <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Factures</th>
                  <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Solde dû</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">État</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.name} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                    <td className="px-5 py-3.5 font-semibold text-[#16171D]">{row.name}</td>
                    <td className="px-5 py-3.5 text-[#414350]">{row.type === 'client' ? 'Client (nous doit)' : 'Brand (on doit)'}</td>
                    <td className="px-5 py-3.5 text-right text-[#414350] num">{row.count}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#D23B3B] num">{fmt(row.total, row.currency)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${row.hasLate ? 'b-late' : 'b-pending'}`}>
                        <span className="b-dot" />
                        {row.hasLate ? 'En retard' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
        <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
          <h2 className="title-badge font-bricolage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Factures détaillées
          </h2>
          <span className="text-[#787C8A] text-[13px] font-medium">
            {unpaid.length} facture{unpaid.length > 1 ? 's' : ''} impayée{unpaid.length > 1 ? 's' : ''}.
          </span>
        </div>

        {unpaid.length === 0 ? (
          <div className="p-12 text-center text-[#787C8A] text-sm">Aucune facture impayée avec ce filtre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
                <tr>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">N°</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Destinataire</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Type</th>
                  <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Montant</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Échéance</th>
                  <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Statut</th>
                  <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((inv) => {
                  const late = inv.status === 'LATE'
                  const dl = late ? daysLate(inv.dueDate) : 0
                  return (
                    <tr key={inv.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#16171D]">{inv.number}</span>
                          {inv.stripeInvoiceId ? (
                            <a href={`https://dashboard.stripe.com/test/invoices/${inv.stripeInvoiceId}`} target="_blank" rel="noopener noreferrer" title="Ouvrir sur Stripe" className="w-6 h-6 rounded-md bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#635BFF] flex items-center justify-center transition">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#414350] font-medium">{inv.client?.name ?? inv.brand?.name ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        {inv.clientId ? (
                          <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold">À émettre</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold">À payer</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#16171D] num">{fmt(inv.amount, inv.currency)}</td>
                      <td className={`px-5 py-3.5 text-xs ${late ? 'text-[#D23B3B] font-semibold' : 'text-[#414350]'}`}>
                        {late ? `échue (+${dl} j)` : new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${late ? 'b-late' : 'b-pending'}`}>
                          <span className="b-dot" />
                          {late ? 'En retard' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <InvoiceActions invoiceId={inv.id} invoiceNumber={inv.number} isPaid={inv.status === 'PAID'} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}