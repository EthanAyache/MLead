// Import des partenaires JBOOST comme clients Mr.Lead, avec leurs catégories.
//
//   node scripts/import-partenaires.mjs --dry-run            (aperçu, n'écrit rien)
//   node scripts/import-partenaires.mjs [--user=email@x.fr]  (import réel ; défaut : premier ADMIN)
//
// Dédoublonnage : un même nom (sans accents / casse / ponctuation) présent dans plusieurs catégories
// devient UN client avec plusieurs catégories. Un client déjà en base avec ce nom est complété
// (catégories ajoutées, téléphone rempli s'il est vide), jamais recréé : le script est rejouable.
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const DATA = new URL('./data/partenaires-2026-09-14.json', import.meta.url)
const dryRun = process.argv.includes('--dry-run')
const userEmail = process.argv.find((a) => a.startsWith('--user='))?.slice(7)

const key = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const slugify = (s) => key(s).replace(/ /g, '-')

// Met les numéros au format « 06 12 34 56 78 » / « +972 … » ; rajoute le 0 perdu par Excel sur 9 chiffres.
function phone(raw) {
  if (!raw) return null
  let d = raw.split(/-(?=\s*0)/)[0].replace(/[^\d+]/g, '')
  if (d.startsWith('+33')) d = '0' + d.slice(3)
  if (/^[1-9]\d{8}$/.test(d)) d = '0' + d
  if (/^0\d{9}$/.test(d)) return d.match(/../g).join(' ')
  if (/^\+?972\d+$/.test(d)) return '+' + d.replace('+', '')
  return raw.trim()
}

const data = JSON.parse(readFileSync(DATA, 'utf8'))
const categories = Object.keys(data)

const partners = new Map()
for (const cat of categories) {
  for (const [name, tel] of data[cat]) {
    const k = key(name)
    const p = partners.get(k) ?? { name, phone: null, cats: new Set() }
    p.phone ??= phone(tel)
    p.cats.add(cat)
    partners.set(k, p)
  }
}

const prisma = new PrismaClient()
try {
  const user = userEmail
    ? await prisma.user.findUnique({ where: { email: userEmail } })
    : await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })
  if (!user) throw new Error(`Utilisateur introuvable (${userEmail ?? 'aucun ADMIN'})`)

  const existing = await prisma.client.findMany({ select: { id: true, name: true, phone: true, archived: true } })
  const byKey = new Map(existing.map((c) => [key(c.name), c]))

  const toCreate = [], toUpdate = [], near = []
  for (const [k, p] of partners) {
    const hit = byKey.get(k)
    if (hit) { toUpdate.push([p, hit]); continue }
    toCreate.push(p)
    // Noms proches (l'un contient l'autre) : signalés seulement, pas fusionnés.
    for (const c of existing) {
      const ck = key(c.name)
      if (ck.length >= 5 && (k.includes(ck) || ck.includes(k))) near.push(`${p.name}  ~  ${c.name}`)
    }
  }

  console.log(`Utilisateur : ${user.email}`)
  console.log(`${categories.length} catégories, ${partners.size} partenaires uniques`)
  console.log(`→ ${toCreate.length} clients à créer, ${toUpdate.length} clients existants à compléter`)
  for (const [p, c] of toUpdate) console.log(`  = ${p.name} (déjà en base${c.archived ? ', archivé' : ''})`)
  if (near.length) { console.log('Noms proches de clients existants (à vérifier) :'); near.forEach((n) => console.log('  ~ ' + n)) }
  const multi = [...partners.values()].filter((p) => p.cats.size > 1)
  if (multi.length) { console.log('Multi-catégories :'); multi.forEach((p) => console.log(`  + ${p.name} : ${[...p.cats].join(', ')}`)) }
  if (dryRun) { console.log('\n--dry-run : rien n\'a été écrit.'); process.exit(0) }

  const catIds = new Map()
  for (const [i, name] of categories.entries()) {
    const c = await prisma.clientCategory.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), position: i },
    })
    catIds.set(name, c.id)
  }
  const connect = (p) => [...p.cats].map((n) => ({ id: catIds.get(n) }))

  for (const p of toCreate) {
    await prisma.client.create({ data: { name: p.name, phone: p.phone, userId: user.id, categories: { connect: connect(p) } } })
  }
  for (const [p, c] of toUpdate) {
    await prisma.client.update({
      where: { id: c.id },
      data: { ...(c.phone ? {} : { phone: p.phone }), categories: { connect: connect(p) } },
    })
  }
  console.log(`\nOK : ${toCreate.length} créés, ${toUpdate.length} complétés.`)
} finally {
  await prisma.$disconnect()
}
