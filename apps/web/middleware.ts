import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
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
  '/api/orders/send-otp',
  '/api/orders/verify-otp',
  '/api/track',
  '/legal',
  '/privacy',
]

// Génère un nonce aléatoire 128 bits, compatible Edge runtime (pas de Buffer).
function buildNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...Array.from(bytes)))
}

// CSP avec nonce par requête.
// 'strict-dynamic' autorise les scripts chargés dynamiquement par un script noncé —
// ce qui permet à Next.js d'hydrater sans 'unsafe-inline'. 'unsafe-eval' reste
// limité au serveur de développement, comme requis par Next.js.
function buildCsp(nonce: string): string {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
    'https://challenges.cloudflare.com',
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ].join('; ')
}

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

  const nonce = buildNonce()
  const cspHeader = buildCsp(nonce)

  // Injecter le nonce dans les headers de la requête pour que les RSC
  // puissent le lire via headers() et l'appliquer à leurs scripts.
  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-nonce', nonce)
  // Next.js extrait le nonce depuis la CSP de la requête de rendu. Le header
  // de réponse seul ne suffit pas à noncer ses scripts d'hydratation.
  reqHeaders.set('Content-Security-Policy', cspHeader)

  const isPublic = PUBLIC_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  // Pour la homepage uniquement, vérifier la session pour rediriger les users connectés
  const isHomepage = pathname === '/'

  if (isPublic && !isHomepage) {
    const response = NextResponse.next({ request: { headers: reqHeaders } })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  let res = NextResponse.next({ request: { headers: reqHeaders } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.headers.set('Content-Security-Policy', cspHeader)
    return res
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: object }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        // Conserver les reqHeaders noncés dans chaque re-création de `res`.
        res = NextResponse.next({ request: { headers: reqHeaders } })
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
  if (isHomepage) {
    res.headers.set('Content-Security-Policy', cspHeader)
    return res
  }

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

    // Avertissement dev si le hook JWT n'est pas activé dans Supabase.
    // Sans ce hook, le middleware fait 3 requêtes DB par requête HTTP protégée.
    if (!hasSubscriptionClaim && process.env.NODE_ENV === 'development') {
      console.warn(
        '[Hanut] Hook JWT Supabase non activé — 3 requêtes DB par requête HTTP. ' +
        'Activer : Dashboard Supabase → Authentication → Hooks → Custom Access Token → set_seller_jwt_claims.'
      )
    }

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

  res.headers.set('Content-Security-Policy', cspHeader)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
