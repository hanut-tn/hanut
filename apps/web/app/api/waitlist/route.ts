import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    const supabase = createServiceClient()
    const { error } = await supabase.from('waitlist').insert({ email: email.trim().toLowerCase() })
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Déjà inscrit !' })
      }
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 })
    }
    return NextResponse.json({ message: 'Inscrit avec succès !' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
