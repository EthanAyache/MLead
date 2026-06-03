'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white font-bricolage font-extrabold backdrop-blur-sm">ML</div>
            <div className="text-left">
              <h1 className="font-bricolage text-2xl font-extrabold text-white tracking-tight">Mr.Lead</h1>
              <p className="text-blue-200 text-xs">Espace facturation</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-bricolage text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié</h2>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
              ✓ Un email vous a été envoyé avec le lien pour réinitialiser votre mot de passe. Vérifiez aussi vos spams.
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-6">Entrez votre email, on vous enverra un lien pour réinitialiser votre mot de passe.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@exemple.com"
                    className="w-full h-11 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">⚠ {error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition disabled:opacity-50">
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">← Retour à la connexion</Link>
          </div>
        </div>
      </div>
    </div>
  )
}