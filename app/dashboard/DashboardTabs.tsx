'use client'

import { useState } from 'react'
import Tabs, { TabKey } from './Tabs'
import ClientsTab from './ClientsTab'
import ApporteursTab from './ApporteursTab'
import MonthlyInvoicesTab, { type MonthlyRow } from './MonthlyInvoicesTab'

type Counts = Record<TabKey, number>

type ClientRow = { id: string; name: string; email: string | null; phone: string | null; totalOwed: number; invoiceCount: number; hasLate: boolean; suspended: boolean }
type ApporteurRow = { id: string; name: string; email: string | null; commissionType: string; commissionValue: number; clientCount: number; activeClients: number; leadCA: number; commission: number }

type Props = {
  counts: Counts
  clientRows: ClientRow[]
  apporteurRows: ApporteurRow[]
  monthlyRows: MonthlyRow[]
  isAdmin: boolean
}

export default function DashboardTabs({ counts, clientRows, apporteurRows, monthlyRows, isAdmin }: Props) {
  const [active, setActive] = useState<TabKey>('facturation')

  return (
    <>
      <Tabs counts={counts} active={active} onChange={setActive} />

      {active === 'facturation' && <MonthlyInvoicesTab rows={monthlyRows} isAdmin={isAdmin} />}
      {active === 'clients' && <ClientsTab clients={clientRows} />}
      {active === 'apporteurs' && <ApporteursTab apporteurs={apporteurRows} />}
    </>
  )
}
