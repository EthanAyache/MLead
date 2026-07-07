import { redirect } from 'next/navigation'

// La connexion est unifiée sur /login (admin + client).
export default function PortalLoginRedirect() {
  redirect('/login')
}
