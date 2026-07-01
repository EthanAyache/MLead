'use client'

export type TabKey = 'facturation' | 'clients' | 'apporteurs'

type Props = {
  counts: Record<TabKey, number>
  active: TabKey
  onChange: (tab: TabKey) => void
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'facturation',
    label: 'Facturation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 14h6M9 18h4" />
      </svg>
    ),
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'apporteurs',
    label: "Apporteurs d'affaires",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    ),
  },
]

export default function Tabs({ counts, active, onChange }: Props) {
  return (
    <nav className="flex gap-2.5 mb-4 flex-wrap" role="tablist">
      {TABS.map((tab) => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`h-10 px-3.5 rounded-[10px] border font-semibold text-sm flex items-center gap-2.5 transition ${
              isActive
                ? 'bg-[#6A4FE6] border-[#6A4FE6] text-white shadow-[0_4px_12px_rgba(106,79,230,.28)]'
                : 'bg-white border-[#DCDDE6] text-[#414350] hover:bg-[#FAFAFC]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`min-w-[22px] h-[22px] px-1.5 rounded-md text-[12.5px] font-bold flex items-center justify-center ${
                isActive ? 'bg-white/[0.22] text-white' : 'bg-[#EFEBFD] text-[#6A4FE6]'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
