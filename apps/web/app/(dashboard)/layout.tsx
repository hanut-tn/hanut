export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { RoleProvider } from '@/lib/role-context'
import { MobileNavProvider } from '@/lib/mobile-nav-context'
import { SentryUserProvider } from '@/components/providers/SentryUserProvider'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'
import BottomNav from '@/components/dashboard/BottomNav'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import DemoBanner from '@/components/dashboard/DemoBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Active une invitation en attente si l'utilisateur vient d'accepter un lien d'invitation.
  // Lookup par token unique d'abord (évite les conflits multi-boutiques),
  // fallback sur email pour les anciennes invitations sans token.
  const invitationToken = user.user_metadata?.invitation_token as string | undefined
  let pending: { id: string; expires_at: string | null } | null = null

  if (invitationToken) {
    const { data } = await serviceClient
      .from('team_members')
      .select('id, expires_at')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .is('user_id', null)
      .maybeSingle()
    pending = data
  } else {
    const { data } = await serviceClient
      .from('team_members')
      .select('id, expires_at')
      .eq('email', user.email!)
      .eq('status', 'pending')
      .is('user_id', null)
      .maybeSingle()
    pending = data
  }

  if (pending) {
    const isExpired = pending.expires_at && new Date(pending.expires_at) < new Date()
    if (!isExpired) {
      await serviceClient
        .from('team_members')
        .update({ user_id: user.id, status: 'active', joined_at: new Date().toISOString(), invitation_token: null })
        .eq('id', pending.id)
    }
  }

  // Résout le contexte : role + sellerId
  const context = await getUserContext()

  if (!context) {
    // Un utilisateur Auth sans seller ni équipe active n'a plus accès.
    // Ne jamais créer automatiquement une boutique ici : un ancien membre
    // supprimé deviendrait sinon propriétaire d'un essai Pro.
    await supabase.auth.signOut()
    redirect('/login?access_revoked=1')
  }

  if (context.isSeller) {
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
      <SentryUserProvider sellerId={context.sellerId} plan={context.plan}>
      <MobileNavProvider>
        <div className="flex min-h-dvh bg-[#FAFAF9]">

          {/* Sidebar desktop — cachée sur mobile */}
          <div className="hidden md:flex shrink-0">
            <Sidebar role={context.role} sellerName={displayName} plan={context.plan} daysLeft={context.daysLeft} />
          </div>

          {/* Drawer mobile */}
          <MobileSidebar role={context.role} sellerName={displayName} plan={context.plan} />

          {/* Contenu principal */}
          <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
            <TopBar sellerName={displayName} role={context.role} isSeller={context.isSeller} />
            {context.daysLeft !== null && context.daysLeft <= 7 && context.daysLeft >= 0 && (
              <DemoBanner daysLeft={context.daysLeft} />
            )}
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:pb-6">
              {children}
            </main>
          </div>

          {/* Bottom nav mobile */}
          <BottomNav role={context.role} plan={context.plan} />
        </div>
      </MobileNavProvider>
      </SentryUserProvider>
    </RoleProvider>
  )
}
