export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { RoleProvider } from '@/lib/role-context'
import { MobileNavProvider } from '@/lib/mobile-nav-context'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'
import BottomNav from '@/components/dashboard/BottomNav'
import MobileSidebar from '@/components/dashboard/MobileSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Active une invitation en attente si l'utilisateur vient d'accepter un lien d'invitation
  const { data: pending } = await serviceClient
    .from('team_members')
    .select('id')
    .eq('email', user.email!)
    .eq('status', 'pending')
    .is('user_id', null)
    .maybeSingle()

  if (pending) {
    await serviceClient
      .from('team_members')
      .update({ user_id: user.id, status: 'active', joined_at: new Date().toISOString() })
      .eq('id', pending.id)
  }

  // Résout le contexte : role + sellerId
  let context = await getUserContext()

  if (!context) {
    // Nouveau vendeur — crée le profil (filet de sécurité si l'inscription a été interrompue)
    await supabase.from('sellers').upsert({
      id: user.id,
      email: user.email!,
      name: (user.user_metadata?.name as string | undefined) ?? user.email!.split('@')[0],
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
    context = { userId: user.id, sellerId: user.id, role: 'admin', isSeller: true, plan: 'starter' }
  } else if (context.isSeller) {
    // Vendeur existant — s'assure que le profil est à jour
    await supabase.from('sellers').upsert({
      id: user.id,
      email: user.email!,
      name: (user.user_metadata?.name as string | undefined) ?? user.email!.split('@')[0],
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  const { data: seller } = await serviceClient
    .from('sellers')
    .select('name')
    .eq('id', context.sellerId)
    .single()

  const displayName = seller?.name ?? user.email ?? ''

  return (
    <RoleProvider role={context.role} sellerId={context.sellerId} isSeller={context.isSeller}>
      <MobileNavProvider>
        <div className="flex min-h-dvh bg-[#FAFAF9]">

          {/* Sidebar desktop — cachée sur mobile */}
          <div className="hidden md:flex shrink-0">
            <Sidebar role={context.role} sellerName={displayName} plan={context.plan} />
          </div>

          {/* Drawer mobile */}
          <MobileSidebar role={context.role} sellerName={displayName} plan={context.plan} />

          {/* Contenu principal */}
          <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
            <TopBar sellerName={displayName} role={context.role} isSeller={context.isSeller} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] md:pb-6">
              {children}
            </main>
          </div>

          {/* Bottom nav mobile */}
          <BottomNav role={context.role} plan={context.plan} />
        </div>
      </MobileNavProvider>
    </RoleProvider>
  )
}
