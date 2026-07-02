-- Ajoute subscription_status pour distinguer l'essai gratuit ('trial') de
-- l'abonnement payant actif ('active').
--
-- Deux valeurs seulement — pas de 'expired' :
-- l'expiration (subscription_end < now()) reste la seule source de vérité
-- pour le blocage d'accès. subscription_status indique uniquement le type
-- d'accès en cours : essai ou payant.
--
-- Règle de backfill : toutes les boutiques existantes reçoivent 'trial'.
-- Le DEFAULT couvre les lignes existantes sans UPDATE séparé.
-- Après migration, appeler activate_paid_subscription pour chaque boutique
-- dont le paiement est déjà confirmé afin de la passer en 'active'.

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL
    CHECK (subscription_status IN ('trial', 'active'))
    DEFAULT 'trial';
