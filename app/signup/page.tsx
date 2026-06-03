'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/app/components/PasswordInput'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Impossible de créer le compte. Réessayez.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.user.id, email, name }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Erreur lors de la création du profil.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white font-bricolage font-extrabold backdrop-blur-sm">
              ML
            </div>
            <div className="text-left">
              <h1 className="font-bricolage text-2xl font-extrabold text-white tracking-tight">Mr.Lead</h1>
              <p className="text-blue-200 text-xs">Espace facturation</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-bricolage text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
          <p className="text-gray-500 text-sm mb-6">Inscrivez-vous pour commencer à utiliser Mr.Lead.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom complet</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ethan AYACHE"
                className="w-full h-11 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full h-11 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="6 caractères minimum" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}