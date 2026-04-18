-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('new_meeting', 'reminder', 'summary')),
  title text NOT NULL,
  message text NOT NULL,
  meeting_id uuid NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread_created
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify admins when a new meeting is created
CREATE OR REPLACE FUNCTION public.notify_admins_new_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  meeting_datetime text;
BEGIN
  meeting_datetime := to_char(NEW.date, 'DD/MM/YYYY') || ' às ' || to_char(NEW.time, 'HH24:MI');

  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, meeting_id)
    VALUES (
      admin_record.user_id,
      'new_meeting',
      'Nova reunião agendada',
      NEW.pre_seller || ' agendou ' || NEW.lead_name || ' para ' || meeting_datetime,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_new_meeting
AFTER INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_meeting();