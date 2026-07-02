-- Ajouter un token unique par invitation pour éviter les conflits
-- quand le même email est invité par deux boutiques différentes.

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS invitation_token TEXT DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_invitation_token
ON team_members(invitation_token)
WHERE invitation_token IS NOT NULL;
