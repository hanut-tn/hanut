import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Politique de confidentialité — Hanut",
  description: "Comment Hanut collecte et utilise vos données personnelles.",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-sm text-[#16A34A] hover:underline mb-8 inline-block">← Retour</Link>

      <h1 className="text-3xl font-bold text-[#1C1917] mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-[#78716C] mb-10">Dernière mise à jour : juin 2026</p>

      <div className="prose prose-stone max-w-none space-y-8 text-[#44403C]">

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">1. Données collectées</h2>
          <p>Dans le cadre de l&apos;utilisation de Hanut, les données suivantes sont collectées :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Informations de compte : nom, adresse e-mail, numéro de téléphone</li>
            <li>Données de boutique : nom de la boutique, slug, catalogue produits</li>
            <li>Données de commandes : informations clients (nom, téléphone, adresse, gouvernorat), produits commandés, montants</li>
            <li>Données d&apos;activité : journaux d&apos;actions pour traçabilité interne</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">2. Finalité du traitement</h2>
          <p>
            Les données collectées sont utilisées exclusivement pour le fonctionnement du service Hanut :
            gestion des commandes, suivi des livraisons, statistiques de vente, et support utilisateur.
            Aucune donnée n&apos;est vendue ou cédée à des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">3. Hébergement des données</h2>
          <p>
            Les données sont hébergées chez <strong>Supabase</strong> (base de données, stockage) et{' '}
            <strong>Vercel</strong> (application web), tous deux basés aux États-Unis, dans des infrastructures
            conformes aux standards de sécurité actuels.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">4. Conservation des données</h2>
          <p>
            Les données sont conservées pendant toute la durée d&apos;utilisation du compte. À la suppression du
            compte, les données de la boutique sont supprimées de façon permanente, sous réserve des obligations
            légales de conservation et du règlement des opérations financières encore en cours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">5. Vos droits (loi organique n° 2004-63)</h2>
          <p>
            Conformément à la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données à
            caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et de
            suppression de vos données personnelles, dans les conditions prévues par la loi.
          </p>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à{' '}
            <a href="mailto:hanut.tn@gmail.com" className="text-[#16A34A] hover:underline">hanut.tn@gmail.com</a>.
            La suppression du compte est également accessible directement depuis les paramètres de l&apos;application
            (Paramètres → Sécurité → Supprimer mon compte).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">6. Droit à l&apos;effacement (anonymisation)</h2>
          <p>
            En tant que vendeur sur Hanut, vous pouvez anonymiser les données personnelles de vos clients
            (nom, téléphone, adresse) tout en conservant l&apos;historique des commandes.
            Cette fonctionnalité est accessible depuis la fiche client dans le tableau de bord.
          </p>
          <p className="mt-2">
            Pour demander l&apos;effacement de vos propres données, vous pouvez supprimer votre compte depuis les
            paramètres. Cette action est irréversible et supprime définitivement toutes vos données et
            celles de votre boutique.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[#1C1917] mb-3">7. Contact</h2>
          <p>
            Pour toute question relative à la protection de vos données :{' '}
            <a href="mailto:hanut.tn@gmail.com" className="text-[#16A34A] hover:underline">hanut.tn@gmail.com</a>
          </p>
        </section>

      </div>
    </div>
  )
}
