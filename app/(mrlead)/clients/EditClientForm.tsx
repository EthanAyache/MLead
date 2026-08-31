'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Client = {
  id: string
  name: string
  companyName: string | null
  siret: string | null
  email: string | null
  phone: string | null
  notifyEmails: string | null
  apporteurId: string | null
}

type Option = { id: string; name: string }

export default function EditClientForm({ client, apporteurs }: { client: Client; apporteurs: Option[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(client.name)
  const [companyName, setCompanyName] = useState(client.companyName ?? '')
  const [siret, setSiret] = useState(client.siret ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [notifyEmails, setNotifyEmails] = useState(client.notifyEmails ?? '')
  const [apporteurId, setApporteurId] = useState(client.apporteurId ?? '')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nom obligatoire'
    if (email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(email)) e.email = 'Email invalide'
    if (siret && siret.replace(/\s/g, '').length !== 14) e.siret = 'Le SIRET doit comporter 14 chiffres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyName, siret, email, phone, notifyEmails, apporteurId: apporteurId || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || 'La modification a échoué. Réessayez.')
        setLoading(false)
        return
      }
    } catch {
      setSubmitError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setLoading(false)
      return
    }
    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  async function handleArchive() {
    if (!confirm(`Archiver le client « ${client.name} » ? Il ne sera plus visible mais ses factures resteront.`)) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || "L'archivage a échoué. Réessayez.")
        setLoading(false)
        return
      }
    } catch {
      setSubmitError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setLoading(false)
      return
    }
    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  const inputBase = "w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
  const ok = "border-gray-300 focus:ring-blue-500"
  const err = "border-red-400 bg-red-50 focus:ring-red-500"

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1"
        title="Modifier"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Modifier
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Modifier le client</h2>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
                <input value={name} onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: '' }) }} className={`${inputBase} ${errors.name ? err : ok}`} />
                {errors.name && <p className="text-red-600 text-xs mt-1">⚠ {errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de l&apos;entreprise</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`${inputBase} ${ok}`} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Numéro SIRET</label>
                <input value={siret} onChange={(e) => { setSiret(e.target.value); setErrors({ ...errors, siret: '' }) }} placeholder="14 chiffres" className={`${inputBase} ${errors.siret ? err : ok}`} />
                {errors.siret && <p className="text-red-600 text-xs mt-1">⚠ {errors.siret}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: '' }) }} className={`${inputBase} ${errors.email ? err : ok}`} />
                {errors.email && <p className="text-red-600 text-xs mt-1">⚠ {errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputBase} ${ok}`} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mails de réception des leads</label>
                <textarea value={notifyEmails} onChange={(e) => setNotifyEmails(e.target.value)} rows={2} placeholder="client@exemple.com, copie@jboost.fr (séparés par virgule)" className={`${inputBase} ${ok}`} />
                <p className="text-[11px] text-gray-400 mt-1">Adresses où sont transférés les leads de ce client (défaut pour tous ses sites). Ajoute une adresse JBoost pour en recevoir une copie.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Apporteur d&apos;affaires</label>
                <select value={apporteurId} onChange={(e) => setApporteurId(e.target.value)} className={`${inputBase} ${ok}`}>
                  <option value="">— Aucun —</option>
                  {apporteurs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {submitError && <p className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">⚠ {submitError}</p>}

              <div className="flex gap-2 justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-semibold text-sm disabled:opacity-50"
                >
                  Archiver
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}