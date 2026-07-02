// Départements métier d'un site (doit rester aligné avec l'enum Prisma `Department`).
export const DEPARTMENTS = [
  { key: 'VOYAGES', label: 'Voyages' },
  { key: 'EVENTS', label: 'Events' },
  { key: 'BTP', label: 'BTP' },
  { key: 'BOUTIQUE', label: 'Boutique' },
  { key: 'AUTRE', label: 'Autre' },
] as const

export type DepartmentKey = (typeof DEPARTMENTS)[number]['key']

export const DEPARTMENT_KEYS = DEPARTMENTS.map((d) => d.key) as DepartmentKey[]

export const DEPARTMENT_LABEL: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.key, d.label]))
