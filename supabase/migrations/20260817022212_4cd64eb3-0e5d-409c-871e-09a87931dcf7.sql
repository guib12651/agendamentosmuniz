CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '5 days';
END;
$$;

SELECT cron.unschedule('cleanup-old-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications');

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$SELECT public.cleanup_old_notifications();$$
);