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
  '/api/orders/public',
  '/api/track',
  '/legal',
  '/privacy',
]

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
    // Étape 1 : l'utilisateur est-il owner (sellers.id = user.id) ?
    const { data: seller } = await supabase
      .from('sellers')
      .select('subscription_end')
      .eq('id', user.id)
      .maybeSingle()

    let subscriptionEnd = seller?.subscription_end ?? null

    // Étape 2 : si pas owner, chercher via team_members pour lire
    // subscription_end du vendeur principal. Sans ce check, un membre
    // d'équipe dont le vendeur a une démo expirée peut continuer à accéder
    // au dashboard indéfiniment.
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

    // Étape 3 : bloquer si démo expirée.
    if (subscriptionEnd && new Date(subscriptionEnd) < new Date()) {
      return NextResponse.redirect(new URL('/billing', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
