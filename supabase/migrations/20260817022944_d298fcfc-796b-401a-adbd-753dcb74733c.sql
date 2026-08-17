-- Substitui o gatilho por-linha por um gatilho por-operação (lote)
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

CREATE OR REPLACE FUNCTION public.trigger_push_notification_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids FROM new_rows;

  IF ids IS NULL OR array_length(ids, 1) = 0 THEN
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := 'https://wznhchivxywklvurzuer.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmhjaGl2eHl3a2x2dXJ6dWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzUzMjgsImV4cCI6MjA5MTc1MTMyOH0.NsdJxgWM4qXPJfljYpQbmCsSou6Q-R6wti0gcyhLMKQ'
    ),
    body := jsonb_build_object('notification_ids', to_jsonb(ids))
  );

  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trigger_push_notification_batch() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_notifications_created_batch
AFTER INSERT ON public.notifications
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_push_notification_batch();