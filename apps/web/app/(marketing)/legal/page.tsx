import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Hanut",
  description: "Conditions générales d'utilisation de la plateforme Hanut.",
}

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-sm text-[#16A34A] hover:underline mb-8 inline-block">← Retour</Link>

      <h1 className="text-3xl font-bold text-[#1C1917] mb-2">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-sm text-[#78716C] mb-10">Dernière mise à jour : juin 2026</p>

      <div className="prose prose-stone max-w-none space-y-8 text-[#44403C]">

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">1. Éditeur du service</h2>
          <p>
            Hanut est une plateforme de gestion de commandes COD (paiement à la livraison) destinée aux
            vendeurs tunisiens. Le service est édité par Hanut, en cours d&apos;enregistrement légal en Tunisie.
            Contact : <a href="mailto:hanut.tn@gmail.com" className="text-[#16A34A] hover:underline">hanut.tn@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">2. Objet</h2>
          <p>
            Hanut met à disposition des vendeurs un outil de gestion de commandes, catalogue produits,
            suivi de livraisons et statistiques de vente. L&apos;accès au service est conditionné à la souscription
            d&apos;un abonnement mensuel.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">3. Accès et compte</h2>
          <p>
            L&apos;utilisateur s&apos;engage à fournir des informations exactes lors de la création de son compte.
            Il est responsable de la confidentialité de ses identifiants et de toutes les actions effectuées
            depuis son compte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">4. Abonnement et paiement</h2>
          <p>
            Les abonnements sont souscrits manuellement via WhatsApp. Le renouvellement n&apos;est pas automatique.
            Hanut se réserve le droit de modifier les tarifs avec un préavis d&apos;au moins 30 jours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">5. Responsabilités</h2>
          <p>
            Hanut ne peut être tenu responsable des pertes de données dues à des incidents techniques,
            ni du contenu des commandes ou transactions réalisées entre les vendeurs et leurs clients.
            L&apos;utilisateur utilise le service sous sa propre responsabilité.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">6. Résiliation</h2>
          <p>
            L&apos;utilisateur peut demander la suppression de son compte à tout moment depuis les paramètres
            de l&apos;application. Hanut se réserve le droit de suspendre un compte en cas de non-respect des
            présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">7. Contact</h2>
          <p>
            Pour toute question relative aux présentes conditions :{' '}
            <a href="mailto:hanut.tn@gmail.com" className="text-[#16A34A] hover:underline">hanut.tn@gmail.com</a>
          </p>
        </section>

      </div>
    </div>
  )
}
