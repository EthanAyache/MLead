'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/app/components/PasswordInput'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : error.message)
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
          <h2 className="font-bricolage text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-gray-500 text-sm mb-6">Connectez-vous pour accéder à votre dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full h-11 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                  Mot de passe oublié ?
                </Link>
              </div>
              <PasswordInput value={password} onChange={setPassword} />
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-semibold">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          Mr.Lead — application de facturation
        </p>
      </div>
    </div>
  )
}