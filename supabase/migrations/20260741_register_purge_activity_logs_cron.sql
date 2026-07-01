-- Enregistre le cron de purge des activity_logs anciens.
-- pg_cron doit être activé dans le dashboard Supabase avant application.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_old_activity_logs') THEN
      PERFORM cron.unschedule('purge_old_activity_logs');
    END IF;

    PERFORM cron.schedule(
      'purge_old_activity_logs',
      '0 3 * * 0',  -- 3h UTC chaque dimanche
      $job$DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '365 days'$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron non activé : laisser la migration passer, puis relancer après activation.
  NULL;
END $$;
