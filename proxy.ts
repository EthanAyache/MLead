import NextAuth from "next-auth"
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server"
import authConfig from "./auth.config"
import { resolveHost, siteSlugFromHost } from "@/lib/siteHost"

const { auth } = NextAuth(authConfig)

// `auth` sert de proxy NextAuth quand on lui passe la requête (voir next-auth/lib : args[0] instanceof
// Request). Ses surcharges de types ne couvrent pas cet appel direct, d'où le cast.
const authProxy = auth as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<Response>

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const h = request.headers
  const slug = siteSlugFromHost(resolveHost(h.get("x-forwarded-host"), h.get("host")))

  // Sous-domaine client : on sert la page publique du site, sans jamais passer par NextAuth
  // (ces pages sont publiques et n'ont rien à voir avec les comptes Mr.Lead).
  if (slug) {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.rewrite(new URL(`/s/${slug}`, request.url))
    }
    // Un site généré n'a qu'une page : tout le reste n'existe pas.
    return new NextResponse("Page introuvable", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  return authProxy(request, event)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
