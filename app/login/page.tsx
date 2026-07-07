import UnifiedLoginForm from './UnifiedLoginForm'

export const metadata = { title: 'Connexion — MonsieurLead' }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F8FB] px-4 py-10 text-[#16171D]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6A4FE6] text-white font-bricolage font-extrabold">M</span>
          <span className="font-bricolage text-lg font-extrabold tracking-tight">MonsieurLead</span>
        </div>
        <div className="rounded-2xl border border-[#E8E9EF] bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
          <UnifiedLoginForm />
        </div>
        <p className="mt-5 text-center text-xs text-[#9AA0AE]">Espace admin et espace client — même connexion.</p>
      </div>
    </main>
  )
}
