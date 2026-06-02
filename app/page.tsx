import Link from 'next/link'

const pages = [
  {
    href: '/leads',
    title: 'Leads',
    desc: 'Toutes les transactions',
    icon: '🏷',
    accent: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    href: '/clients',
    title: 'Clients',
    desc: 'Vos clients qui achètent des leads',
    icon: '👥',
    accent: 'from-emerald-500 to-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    href: '/brands',
    title: 'Brands',
    desc: 'Vos fournisseurs de leads',
    icon: '📦',
    accent: 'from-orange-500 to-orange-600',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    href: '/apporteurs',
    title: 'Apporteurs',
    desc: "Apporteurs d'affaires et commissions",
    icon: '🤝',
    accent: 'from-purple-500 to-purple-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bande bleue header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white font-extrabold backdrop-blur-sm">
            ML
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Mr.Lead</h1>
            <p className="text-blue-200 text-xs">Monsieur Lead — Espace facturation</p>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Tableau de bord</h2>
          <p className="text-gray-500">Choisissez une section pour démarrer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pages.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              {/* Trait coloré à gauche */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b ${p.accent}`} />

              <div className="flex items-start gap-4 pl-2">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">{p.title}</h3>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${p.badge}`}>
                      Actif
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{p.desc}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Bandeau d'infos */}
        <div className="mt-10 bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">💡</div>
          <div className="flex-1 text-sm text-gray-600">
            Les <span className="font-semibold text-gray-900">factures</span>, le <span className="font-semibold text-gray-900">dashboard avec onglets</span> et l'intégration <span className="font-semibold text-gray-900">Stripe</span> arrivent bientôt.
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        Mr.Lead — application en cours de développement
      </footer>
    </div>
  )
}