import Link from 'next/link'

export default function StorytellingSarra() {
  return (
    <section className="relative overflow-hidden bg-[#0d2010] py-28 sm:py-36">
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="mb-8 font-mono text-sm text-brand-400/60">23:47</div>

        <div className="space-y-6">
          <p className="font-playfair text-3xl leading-relaxed text-white sm:text-4xl">
            Sarra vient de poster sa nouvelle collection.
          </p>
          <p className="text-lg leading-relaxed text-white/60">
            Les DMs arrivent. Les commentaires aussi.
            « C&apos;est combien ? » « Vous livrez à Sfax ? »
            « Je veux la rouge en taille M. »
          </p>
          <p className="text-lg leading-relaxed text-white/60">
            Elle répond à tout. Elle note tout.
            Elle sait qu&apos;elle va quand même perdre des commandes.
          </p>

          <div className="flex items-center gap-4 py-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-white/20">Avec Hanut</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="font-playfair text-3xl leading-relaxed text-brand-400 sm:text-4xl">
            Ses clients commandent directement.
          </p>
          <p className="text-lg leading-relaxed text-white/60">
            Le matin, elle ouvre son dashboard.
            Toutes les commandes sont là. Le stock est à jour.
            Les adresses sont vérifiées. Les livraisons prêtes.
          </p>
          <p className="font-playfair text-2xl italic text-white/80">
            Rien n&apos;est perdu. Jamais.
          </p>
        </div>

        <div className="mt-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            Commencer comme Sarra →
          </Link>
        </div>
      </div>
    </section>
  )
}
