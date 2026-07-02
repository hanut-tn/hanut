-- Ajoute une date d'expiration aux invitations (7 jours par défaut)
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill pour les invitations existantes en attente
UPDATE team_members
SET expires_at = invited_at + INTERVAL '7 days'
WHERE expires_at IS NULL AND status = 'pending';
