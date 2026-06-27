import { NextResponse } from 'next/server'

// Route dépréciée — retourne HTTP 410 Gone pour guider les anciens formulaires.
// La création publique passe par /api/orders/send-otp puis /api/orders/verify-otp.
// À supprimer une fois tous les formulaires publics mis à jour vers la version OTP.
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
