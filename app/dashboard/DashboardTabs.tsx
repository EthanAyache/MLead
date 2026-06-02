'use client'

import { useState } from 'react'
import Tabs, { TabKey } from './Tabs'
import QuiDoitAQuiFilter, { FilterValue } from './QuiDoitAQuiFilter'
import InvoicesTab from './InvoicesTab'

type Option = { id: string; name: string }
type Counts = Record<TabKey, number>

type Invoice = {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  dueDate: string
  clientId: string | null
  brandId: string | null
  client: { id: string; name: string } | null
  brand: { id: string; name: string } | null
}

type Props = {
  counts: Counts
  brands: Option[]
  clients: Option[]
  apporteurs: Option[]
  invoices: Invoice[]
}

export default function DashboardTabs({ counts, brands, clients, apporteurs, invoices }: Props) {
  const [active, setActive] = useState<TabKey>('factures')
  const [filter, setFilter] = useState<FilterValue>({ debtorType: '', debtorName: '', creditorType: '', creditorName: '' })

  return (
    <>
      <Tabs counts={counts} active={active} onChange={setActive} />

      {active === 'factures' && (
        <>
          <QuiDoitAQuiFilter brands={brands} clients={clients} apporteurs={apporteurs} onApply={setFilter} />
          <InvoicesTab invoices={invoices} filter={filter} />
        </>
      )}

      {active !== 'factures' && (
        <div className="bg-white border border-dashed border-[#DCDDE6] rounded-[14px] p-12 text-center text-[#787C8A] text-sm">
          📑 Onglet <strong className="text-[#16171D]">{active}</strong> — bientôt disponible.
        </div>
      )}
    </>
  )
}