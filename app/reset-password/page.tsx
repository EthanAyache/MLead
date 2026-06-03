'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/app/components/PasswordInput'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Au moins 6 caractères.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-bricolage text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-500 text-sm mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="6 caractères minimum" />
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">⚠ {error}</div>}
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition disabled:opacity-50">
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}