'use client'

type Option = { id: string; name: string }

// Sélection multiple des catégories d'un client, sous forme de pastilles cliquables.
export default function CategoryPicker({ categories, value, onChange }: { categories: Option[]; value: string[]; onChange: (ids: string[]) => void }) {
  if (categories.length === 0) return <p className="text-xs text-gray-400">Aucune catégorie définie.</p>

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
      {categories.map((c) => {
        const on = value.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
