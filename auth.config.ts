import type { NextAuthConfig } from "next-auth"

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const p = nextUrl.pathname

      const isAuthPage =
        p.startsWith("/login") ||
        p.startsWith("/signup")

      // Portail client : espace public authentifié à part (cookie signé, vérifié dans les pages).
      // Le middleware admin ne s'y applique pas.
      if (p.startsWith("/portail")) return true

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      return isLoggedIn
    },
  },
} satisfies NextAuthConfig