import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { NextResponse } from 'next/server'

function failure(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function DELETE(request: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const confirmationEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!confirmationEmail) return failure('Confirmation email requise.', 400)

  const supabase = createServiceClient()
  const { sellerId, userId } = context

  // Vérifier que l'email correspond avant tout
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('email')
    .eq('id', sellerId)
    .single()

  if (sellerError || !seller?.email) {
    return failure(sellerError?.message ?? 'Compte vendeur introuvable.', sellerError ? 500 : 404)
  }

  if (confirmationEmail !== seller.email.trim().toLowerCase()) {
    return failure('Email de confirmation incorrect.', 400)
  }

  // Suppression transactionnelle via RPC (COD check + cascade inclus)
  const { error: rpcError } = await supabase.rpc('delete_seller_account', {
    p_seller_id: sellerId,
    p_user_id: userId,
  })

  if (rpcError) {
    if (rpcError.message.includes('cod_pending')) {
      return NextResponse.json(
        { error: 'Vous avez du COD en attente de reversal. Récupérez vos fonds avant de supprimer votre compte.' },
        { status: 400 }
      )
    }
    if (rpcError.message.includes('seller_not_found')) {
      return failure('Compte vendeur introuvable.', 404)
    }
    return failure('Erreur lors de la suppression. Veuillez réessayer.')
  }

  // Supprimer le compte Auth uniquement si la RPC a réussi
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)

  if (authError) {
    // DB nettoyée mais Auth non supprimé — l'utilisateur ne peut plus se connecter
    // car ses données sont absentes. Logger pour traitement manuel si nécessaire.
    console.error('CRITICAL: DB deleted but Auth user remains:', userId, authError.message)
  }

  return NextResponse.json({ success: true })
}
