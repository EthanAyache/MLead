'use client'

import { useState } from 'react'
import Tabs, { TabKey } from './Tabs'
import QuiDoitAQuiFilter, { FilterValue } from './QuiDoitAQuiFilter'
import InvoicesTab from './InvoicesTab'
import ClientsTab from './ClientsTab'
import ApporteursTab from './ApporteursTab'
import HistoryTab from './HistoryTab'
import ArchivesTab from './ArchivesTab'

type Option = { id: string; name: string }
type Counts = Record<TabKey, number>

type Invoice = {
  id: string; number: string; amount: number; currency: string; status: string; dueDate: string; paidAt: string | null
  clientId: string | null; brandId: string | null; apporteurId: string | null; stripeInvoiceId: string | null
  debtorType: string; creditorType: string; debtorName: string; creditorName: string
  client: { id: string; name: string } | null; brand: { id: string; name: string } | null; apporteur: { id: string; name: string } | null
}

type ClientRow = { id: string; name: string; email: string | null; phone: string | null; totalOwed: number; invoiceCount: number; hasLate: boolean }
type ApporteurRow = { id: string; name: string; email: string | null; commissionType: string; commissionValue: number; clientCount: number }

type Props = {
  counts: Counts
  clients: Option[]
  apporteurs: Option[]
  invoices: Invoice[]
  clientRows: ClientRow[]
  apporteurRows: ApporteurRow[]
  paidInvoices: Invoice[]
  archivedInvoices: Invoice[]
  showArchives: boolean
}

export default function DashboardTabs({ counts, clients, apporteurs, invoices, clientRows, apporteurRows, paidInvoices, archivedInvoices, showArchives }: Props) {
  const [active, setActive] = useState<TabKey>('factures')
  const [filter, setFilter] = useState<FilterValue>({ debtorType: '', debtorName: '', creditorType: '', creditorName: '' })

  // Mode archives : on n'affiche QUE l'onglet archives
  if (showArchives) {
    return <ArchivesTab archived={archivedInvoices} />
  }

  return (
    <>
      <Tabs counts={counts} active={active} onChange={setActive} />

      {active === 'factures' && (
        <>
          <QuiDoitAQuiFilter clients={clients} apporteurs={apporteurs} onApply={setFilter} />
          <InvoicesTab invoices={invoices} filter={filter} />
        </>
      )}
      {active === 'clients' && <ClientsTab clients={clientRows} />}
      {active === 'apporteurs' && <ApporteursTab apporteurs={apporteurRows} />}
      {active === 'historique' && <HistoryTab invoices={paidInvoices} />}
    </>
  )
}