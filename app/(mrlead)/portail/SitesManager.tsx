import Link from 'next/link'

export type SiteRow = { id: string; name: string; campagneName: string; unitPrice: number; billingMode: 'MONTHLY' | 'PREPAID'; leadsCount: number; hasPublicPage: boolean }

function FormulaBadge({ mode }: { mode: 'MONTHLY' | 'PREPAID' }) {
  return mode === 'PREPAID' ? (
    <span className="shrink-0 rounded-full bg-[#EFEBFD] px-2.5 py-0.5 text-xs font-semibold text-[#6A4FE6]">Prépayé</span>
  ) : (
    <span className="shrink-0 rounded-full bg-[#F1F2F6] px-2.5 py-0.5 text-xs font-semibold text-[#4B4F5C]">Mensuel</span>
  )
}

// Vue client des sites : lecture seule. La formule et l'arrêt d'un site sont gérés par l'admin.
export default function SitesManager({
  active, archived, locked, stopPayUrl, canCreateSite,
}: {
  active: SiteRow[]
  archived: SiteRow[]
  locked: boolean
  stopPayUrl: string | null
  // Reste-t-il un site sans page publique ? (une page par site)
  canCreateSite: boolean
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bricolage text-lg font-bold">Vos sites</h2>
        {canCreateSite && !locked && (
          <Link href="/portail/nouveau-site"
                className="rounded-xl bg-[#6A4FE6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5840CC]">
            Créer ma page
          </Link>
        )}
      </div>

      {locked && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#B91C1C]">Facture d&apos;arrêt en attente — réglez-la pour reprendre.</p>
          {stopPayUrl && (
            <a href={stopPayUrl} className="shrink-0 rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]">Payer ma facture</a>
          )}
        </div>
      )}

      {/* Sites actifs (lecture seule) */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
        {active.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#787C8A]">Aucun site actif.</div>
        ) : (
          <ul className="divide-y divide-[#EEF0F5]">
            {active.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <Link href={`/portail/site/${s.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#16171D] hover:text-[#6A4FE6]">{s.name}</div>
                  <div className="truncate text-xs text-[#9AA0AE]">{s.campagneName} · {s.unitPrice.toFixed(2)} € HT / lead</div>
                </Link>
                <Link href={s.hasPublicPage ? `/portail/site/${s.id}/page-publique` : '/portail/nouveau-site'}
                      className="shrink-0 text-xs font-semibold text-[#6A4FE6] hover:underline">
                  {s.hasPublicPage ? 'Ma page' : 'Créer ma page'}
                </Link>
                <FormulaBadge mode={s.billingMode} />
                <span className="shrink-0 text-sm"><span className="font-bold text-[#16171D]">{s.leadsCount}</span> <span className="text-[#9AA0AE]">leads</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sites archivés (consultation) */}
      {archived.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#787C8A]">Sites archivés</h3>
          <div className="mt-2 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            <ul className="divide-y divide-[#EEF0F5]">
              {archived.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#787C8A]">{s.name}</div>
                    <div className="truncate text-xs text-[#9AA0AE]">{s.campagneName} · {s.leadsCount} lead{s.leadsCount > 1 ? 's' : ''} reçu{s.leadsCount > 1 ? 's' : ''}</div>
                  </div>
                  <Link href={`/portail/site/${s.id}`} className="shrink-0 text-sm font-semibold text-[#6A4FE6] hover:underline">Consulter</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
