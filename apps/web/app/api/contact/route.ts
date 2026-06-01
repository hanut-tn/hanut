import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    const supabase = createServiceClient()
    const { error } = await supabase.from('contact_messages').insert({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      message: String(message).trim(),
    })
    if (error) {
      return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
    }
    return NextResponse.json({ message: 'Message envoyé !' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
