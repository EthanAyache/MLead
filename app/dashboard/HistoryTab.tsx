'use client'

type Invoice = {
  id: string
  number: string
  amount: number
  currency: string
  paidAt: string | null
  client: { id: string; name: string } | null
  brand: { id: string; name: string } | null
}

function symbol(c: string) {
  return c === 'EUR' ? '€' : c === 'ILS' ? '₪' : '$'
}

function fmt(amount: number, currency: string) {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol(currency)
}

export default function HistoryTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 7v5l4 2" /><circle cx="12" cy="12" r="9" />
          </svg>
          Historique des paiements
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          {invoices.length} facture{invoices.length > 1 ? 's' : ''} payée{invoices.length > 1 ? 's' : ''}.
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">Aucune facture payée pour le moment.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Date paiement</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">N° facture</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Destinataire</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Montant</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                  <td className="px-5 py-3.5 text-[#414350] text-xs">{i.paidAt ? new Date(i.paidAt).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-5 py-3.5 font-bold text-[#16171D]">{i.number}</td>
                  <td className="px-5 py-3.5 text-[#414350] font-medium">{i.client?.name ?? i.brand?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-[#1F8A53] num">{fmt(i.amount, i.currency)}</td>
                  <td className="px-5 py-3.5">
                    <span className="badge b-paid"><span className="b-dot" />Payée</span>
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