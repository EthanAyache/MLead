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

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      return isLoggedIn
    },
  },
} satisfies NextAuthConfig