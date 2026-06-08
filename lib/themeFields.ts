// Champs personnalisés d'un thème (stockés en JSON sur Theme.fields)
export type FieldType = 'text' | 'number'

export type ThemeField = {
  key: string
  label: string
  type: FieldType
}

export function slugify(input: string) {
  return (
    input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '')
      .slice(0, 40) || 'champ'
  )
}

// Normalise une liste de champs venant du client : génère des clés uniques, filtre les labels vides.
export function normalizeFields(raw: unknown): ThemeField[] {
  if (!Array.isArray(raw)) return []
  const used = new Set<string>()
  const out: ThemeField[] = []
  for (const item of raw) {
    const label = String((item as { label?: unknown })?.label ?? '').trim()
    if (!label) continue
    const type: FieldType = (item as { type?: unknown })?.type === 'number' ? 'number' : 'text'
    let key = slugify(label)
    let n = 2
    while (used.has(key)) key = `${slugify(label)}_${n++}`
    used.add(key)
    out.push({ key, label, type })
  }
  return out
}

// Lit Theme.fields (JSON Prisma) en tableau typé.
export function readFields(value: unknown): ThemeField[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((f): f is ThemeField => !!f && typeof (f as ThemeField).key === 'string' && typeof (f as ThemeField).label === 'string')
    .map((f) => ({ key: f.key, label: f.label, type: f.type === 'number' ? 'number' : 'text' }))
}
