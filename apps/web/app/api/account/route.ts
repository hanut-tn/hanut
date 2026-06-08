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

  // Récupérer les IDs de commandes pour ce vendeur
  const { data: sellerOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('seller_id', sellerId)

  if (ordersError) return failure(ordersError.message)

  // Bloquer si COD collecté mais pas encore reversé
  if (sellerOrders && sellerOrders.length > 0) {
    const orderIds = sellerOrders.map(o => o.id as string)
    const { data: pendingCOD, error: pendingCodError } = await supabase
      .from('deliveries')
      .select('id')
      .in('order_id', orderIds)
      .eq('cod_collected', true)
      .eq('cod_reversed', false)

    if (pendingCodError) return failure(pendingCodError.message)

    if (pendingCOD && pendingCOD.length > 0) {
      return NextResponse.json({
        error: `Impossible de supprimer votre compte. ${pendingCOD.length} livraison${pendingCOD.length !== 1 ? 's' : ''} ont un COD collecté mais pas encore reversé.`,
      }, { status: 400 })
    }
  }

  // Suppression en cascade dans le bon ordre
  const { error: activityError } = await supabase.from('activity_logs').delete().eq('seller_id', sellerId)
  if (activityError) return failure(activityError.message)

  const { error: stockMovementsError } = await supabase.from('stock_movements').delete().eq('seller_id', sellerId)
  if (stockMovementsError) return failure(stockMovementsError.message)

  const { error: restockError } = await supabase.from('restock_orders').delete().eq('seller_id', sellerId)
  if (restockError) return failure(restockError.message)

  if (sellerOrders && sellerOrders.length > 0) {
    const orderIds = sellerOrders.map(o => o.id as string)
    const { error: historyError } = await supabase.from('order_status_history').delete().in('order_id', orderIds)
    if (historyError) return failure(historyError.message)

    const { error: deliveriesError } = await supabase.from('deliveries').delete().in('order_id', orderIds)
    if (deliveriesError) return failure(deliveriesError.message)
  }

  const { error: deleteOrdersError } = await supabase.from('orders').delete().eq('seller_id', sellerId)
  if (deleteOrdersError) return failure(deleteOrdersError.message)

  const { error: customersError } = await supabase.from('customers').delete().eq('seller_id', sellerId)
  if (customersError) return failure(customersError.message)

  const { error: productsError } = await supabase.from('products').delete().eq('seller_id', sellerId)
  if (productsError) return failure(productsError.message)

  const { error: teamError } = await supabase.from('team_members').delete().eq('seller_id', sellerId)
  if (teamError) return failure(teamError.message)

  const { error: sellerDeleteError } = await supabase.from('sellers').delete().eq('id', sellerId)
  if (sellerDeleteError) return failure(sellerDeleteError.message)

  // Supprimer le compte Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    return failure(authError.message)
  }

  return NextResponse.json({ success: true })
}
