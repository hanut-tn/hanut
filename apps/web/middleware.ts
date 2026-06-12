import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/features',
  '/pricing',
  '/about',
  '/carriers',
  '/mobile',
  '/roadmap',
  '/contact',
  '/order',
  '/track',
  '/billing',
  '/api/auth/register',
  '/api/auth/callback',
  '/api/contact',
  '/api/waitlist',
  '/api/csp-report',
  '/api/orders/public',
  '/api/track',
  '/legal',
  '/privacy',
]

// Edge-compatible base64url → JSON decoder (no Buffer, no Node APIs).
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64url = token.split('.')[1]
    if (!base64url) return {}
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  // Pour la homepage uniquement, vérifier la session pour rediriger les users connectés
  const isHomepage = pathname === '/'

  if (isPublic && !isHomepage) return NextResponse.next()

  let res = NextResponse.next({ request: req })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: object }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options as never)
        )
      },
    },
  })

  // getUser() valide le JWT côté Supabase Auth (1 requête réseau, obligatoire).
  const { data: { user } } = await supabase.auth.getUser()

  // Utilisateur connecté sur la homepage → dashboard
  if (user && isHomepage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Homepage sans session → landing page
  if (isHomepage) return res

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Vérification démo expirée — uniquement pour les routes non-billing.
  if (!pathname.startsWith('/billing')) {
    // Lire subscription_end depuis les claims JWT (0 requête DB).
    // getSession() lit le cookie en local, pas de réseau.
    // Fallback vers les requêtes DB si les claims ne sont pas présents
    // (JWTs créés avant l'activation du hook).
    const { data: { session } } = typeof supabase.auth.getSession === 'function'
      ? await supabase.auth.getSession()
      : { data: { session: null } }
    const claims = session?.access_token ? decodeJwtPayload(session.access_token) : {}
    const hasSubscriptionClaim = Object.prototype.hasOwnProperty.call(claims, 'subscription_end')
    const subscriptionEndFromClaim = typeof claims.subscription_end === 'string'
      ? claims.subscription_end
      : null

    let subscriptionEnd: string | null = subscriptionEndFromClaim

    if (!hasSubscriptionClaim) {
      // Pas de claim → anciens JWTs sans hook. Fallback DB.
      const { data: seller } = await supabase
        .from('sellers')
        .select('subscription_end')
        .eq('id', user.id)
        .maybeSingle()

      subscriptionEnd = seller?.subscription_end ?? null

      if (!seller) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('seller_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (membership?.seller_id) {
          const { data: ownerSeller } = await supabase
            .from('sellers')
            .select('subscription_end')
            .eq('id', membership.seller_id)
            .maybeSingle()

          subscriptionEnd = ownerSeller?.subscription_end ?? null
        }
      }
    }

    if (subscriptionEnd && new Date(subscriptionEnd) < new Date()) {
      return NextResponse.redirect(new URL('/billing', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
