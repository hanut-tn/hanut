export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Crée le profil vendeur s'il n'existe pas encore (ex: inscription interrompue)
  await supabase.from('sellers').upsert({
    id: user.id,
    email: user.email!,
    name: (user.user_metadata?.name as string | undefined) ?? user.email!.split('@')[0],
    phone: (user.user_metadata?.phone as string | undefined) ?? null,
  }, { onConflict: 'id', ignoreDuplicates: true })

  const { data: seller } = await supabase
    .from('sellers')
    .select('name, plan')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar sellerName={(seller as { name: string } | null)?.name ?? user.email ?? ''} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
