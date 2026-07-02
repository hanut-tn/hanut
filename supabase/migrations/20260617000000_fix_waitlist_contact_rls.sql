-- Ajouter des policies SELECT sur waitlist et contact_messages.
-- Ces tables avaient RLS activée mais aucune policy SELECT :
-- deny-by-default total, même via service_role avec la clé API.
-- Le Dashboard Supabase utilise service_role et peut lire sans policy,
-- mais une API Route utilisant createServiceClient() ne peut pas lire
-- ces données sans cette correction.

-- waitlist : lecture service_role uniquement
-- (les données sont lues via le Dashboard ou une future page admin)
DROP POLICY IF EXISTS "waitlist_service_role_read" ON waitlist;
CREATE POLICY "waitlist_service_role_read" ON waitlist
  FOR SELECT
  TO service_role
  USING (true);

-- contact_messages : lecture service_role uniquement
DROP POLICY IF EXISTS "contact_messages_service_role_read" ON contact_messages;
CREATE POLICY "contact_messages_service_role_read" ON contact_messages
  FOR SELECT
  TO service_role
  USING (true);

-- INSERT reste ouvert (pas de policy = deny par défaut → ajouter policy INSERT)
-- Note : les inserts dans ces tables sont déjà possibles via service_role
-- (qui bypass RLS), mais pour le principe de moindre privilège on les documente ici.

-- Pour une future page admin qui liste les messages de contact :
-- créer une API Route qui utilise createServiceClient() et vérifie
-- un flag admin (ex : whitelist email ou colonne sellers.is_admin).
