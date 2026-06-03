import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl
  const isAuthPage = url.pathname.startsWith('/login') ||
                     url.pathname.startsWith('/signup') ||
                     url.pathname.startsWith('/forgot-password') ||
                     url.pathname.startsWith('/reset-password') ||
                     url.pathname.startsWith('/auth')

  // Routes publiques (pas d'auth nécessaire)
  const isPublicRoute = isAuthPage ||
                        url.pathname.startsWith('/api/stripe/webhook') ||
                        url.pathname.startsWith('/_next') ||
                        url.pathname === '/favicon.ico'

  // Non connecté + route protégée → redirige vers login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté + sur page login → redirige vers dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}