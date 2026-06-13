import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const metadata: Metadata = {
  title: 'Admin — Hanut',
  robots: { index: false, follow: false },
}

const ADMIN_EMAILS = (process.env.HANUT_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export default async function AdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userEmail = user.email?.trim().toLowerCase()
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    redirect('/dashboard')
  }

  const serviceClient = createServiceClient()

  const [contactsResult, waitlistResult] = await Promise.all([
    serviceClient
      .from('contact_messages')
      .select('id, name, email, message, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    serviceClient
      .from('waitlist')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (contactsResult.error || waitlistResult.error) {
    throw new Error(
      contactsResult.error?.message
      ?? waitlistResult.error?.message
      ?? 'Impossible de charger les données administrateur.'
    )
  }

  const contacts = contactsResult.data
  const waitlist = waitlistResult.data

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin</h1>
        <p className="text-sm text-[#78716C] mt-1">Accès réservé à {userEmail}</p>
      </div>

      {/* Waitlist */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Waitlist</h2>
          <span className="text-sm text-[#78716C]">{waitlist?.length ?? 0} inscription{(waitlist?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>
        {!waitlist || waitlist.length === 0 ? (
          <p className="text-sm text-[#78716C]">Aucune inscription pour l&apos;instant.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E4] text-left">
                  <th className="pb-2 font-medium text-[#78716C]">Email</th>
                  <th className="pb-2 font-medium text-[#78716C] whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F4]">
                {waitlist.map(entry => (
                  <tr key={entry.id}>
                    <td className="py-2.5 text-gray-900">{entry.email}</td>
                    <td className="py-2.5 text-[#78716C] whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('fr-TN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Contact messages */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Messages de contact</h2>
          <span className="text-sm text-[#78716C]">{contacts?.length ?? 0} message{(contacts?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>
        {!contacts || contacts.length === 0 ? (
          <p className="text-sm text-[#78716C]">Aucun message pour l&apos;instant.</p>
        ) : (
          <div className="space-y-4">
            {contacts.map(msg => (
              <div key={msg.id} className="border border-[#E7E5E4] rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{msg.name}</p>
                    <a href={`mailto:${msg.email}`} className="text-sm text-[#16A34A] hover:underline">
                      {msg.email}
                    </a>
                  </div>
                  <p className="text-xs text-[#78716C] whitespace-nowrap shrink-0">
                    {new Date(msg.created_at).toLocaleDateString('fr-TN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-sm text-[#44403C] whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
