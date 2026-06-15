import { NextResponse } from 'next/server'

// Ancienne route conservée temporairement pour fournir une erreur explicite aux
// clients obsolètes. La création publique passe désormais obligatoirement par
// /api/orders/send-otp puis /api/orders/verify-otp.
export async function POST() {
  return NextResponse.json(
    {
      error: 'La vérification par email est obligatoire. Rechargez le formulaire.',
      code: 'OTP_REQUIRED',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
