import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/csrf'

type OnboardingAction = 'link_copied' | 'first_order' | 'complete' | 'dismiss'

function isOnboardingAction(action: unknown): action is OnboardingAction {
  return action === 'link_copied' || action === 'first_order' || action === 'complete' || action === 'dismiss'
}

export async function PATCH(req: NextRequest) {
  if (!checkOrigin(req)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.isSeller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })
  if (!isOnboardingAction(body.action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const supabase = await createServerClient()

  if (body.action === 'dismiss') {
    const until = typeof body.until === 'string' ? body.until : null
    if (!until) return NextResponse.json({ error: 'Missing until' }, { status: 400 })
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ onboarding_dismissed_until: until })
      .eq('id', context.sellerId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'link_copied' || body.action === 'first_order') {
    const { data: seller, error: selectError } = await supabase
      .from('sellers')
      .select('onboarding_steps, slug')
      .eq('id', context.sellerId)
      .single()

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    if (body.action === 'link_copied' && !seller?.slug) {
      return NextResponse.json({ error: "Créez votre URL avant de copier le lien." }, { status: 400 })
    }

    const currentSteps = (seller?.onboarding_steps ?? {}) as Record<string, unknown>
    const updated = { ...currentSteps, [body.action]: true }
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ onboarding_steps: updated })
      .eq('id', context.sellerId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidatePath('/dashboard')
    revalidateTag(`dashboard-${context.sellerId}`)

    return NextResponse.json({ success: true })
  }

  const { error: updateError } = await supabase
    .from('sellers')
    .update({ onboarding_completed: true })
    .eq('id', context.sellerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)

  return NextResponse.json({ success: true })
}
