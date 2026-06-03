'use client'

import InvoiceActions from './InvoiceActions'

type Invoice = {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  dueDate: string
  paidAt: string | null
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

function statusLabel(s: string) {
  return { PAID: 'Payée', LATE: 'En retard', PENDING: 'En attente', CANCELLED: 'Annulée' }[s] ?? s
}

function statusClass(s: string) {
  return s === 'PAID' ? 'b-paid' : s === 'LATE' ? 'b-late' : 'b-pending'
}

export default function ArchivesTab({ archived }: { archived: Invoice[] }) {
  return (
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 8v13H3V8M1 3h22v5H1z" />
          </svg>
          Archives
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          {archived.length} facture{archived.length > 1 ? 's' : ''} archivée{archived.length > 1 ? 's' : ''}. Cliquez sur « Restaurer » pour la remettre active.
        </span>
      </div>

      {archived.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">Aucune facture archivée.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">N°</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Destinataire</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Type</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Montant</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Statut</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((inv) => (
                <tr key={inv.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition opacity-75">
                  <td className="px-5 py-3.5 font-bold text-[#16171D]">{inv.number}</td>
                  <td className="px-5 py-3.5 text-[#414350] font-medium">{inv.client?.name ?? inv.brand?.name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {inv.clientId ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold">À émettre</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold">À payer</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-[#16171D] num">{fmt(inv.amount, inv.currency)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${statusClass(inv.status)}`}>
                      <span className="b-dot" />
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <InvoiceActions invoiceId={inv.id} invoiceNumber={inv.number} isPaid={inv.status === 'PAID'} isArchived={true} />
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