-- Purge automatique des activity_logs anciens (rétention 180 jours)
-- Activer pg_cron dans Supabase Dashboard → Database → Extensions avant
-- d'appliquer cette migration, puis planifier avec la commande commentée ci-dessous.

CREATE OR REPLACE FUNCTION purge_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;

REVOKE ALL ON FUNCTION purge_old_activity_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_activity_logs() TO service_role;

-- Après activation de pg_cron, exécuter une seule fois dans SQL Editor :
-- SELECT cron.schedule(
--   'purge-activity-logs-weekly',
--   '0 2 * * 0',
--   $$SELECT purge_old_activity_logs()$$
-- );
