'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddBrandForm() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validate() {
    const newErrors: typeof errors = {}
    if (!name.trim()) newErrors.name = 'Le nom est obligatoire'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Format d'email invalide (exemple : nom@domaine.fr)"
    }
    if (phone && !/^[0-9+\-.\s()]+$/.test(phone)) {
      newErrors.phone = 'Le numéro doit contenir uniquement des chiffres et + - . ( ) espaces'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(data.error || "L'enregistrement a échoué. Réessayez.")
        setLoading(false)
        return
      }
    } catch {
      setSubmitError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setLoading(false)
      return
    }
    setName(''); setEmail(''); setPhone(''); setErrors({})
    setIsOpen(false)
    setLoading(false)
    router.refresh()
  }

  const inputBase = "w-full border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
  const inputOk = "border-gray-300 focus:ring-blue-500"
  const inputErr = "border-red-400 bg-red-50 focus:ring-red-500"

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
        + Ajouter une brand
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Nouvelle brand</h2>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <input value={name} onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: undefined }) }} placeholder="Nom *" className={`${inputBase} ${errors.name ? inputErr : inputOk}`} />
                {errors.name && <p className="text-red-600 text-xs mt-1 ml-1">⚠ {errors.name}</p>}
              </div>
              <div>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }} placeholder="Email" className={`${inputBase} ${errors.email ? inputErr : inputOk}`} />
                {errors.email && <p className="text-red-600 text-xs mt-1 ml-1">⚠ {errors.email}</p>}
              </div>
              <div>
                <input value={phone} onChange={(e) => { setPhone(e.target.value); setErrors({ ...errors, phone: undefined }) }} placeholder="Téléphone" className={`${inputBase} ${errors.phone ? inputErr : inputOk}`} />
                {errors.phone && <p className="text-red-600 text-xs mt-1 ml-1">⚠ {errors.phone}</p>}
              </div>
              {submitError && <p className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">⚠ {submitError}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setErrors({}); setSubmitError(null) }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}