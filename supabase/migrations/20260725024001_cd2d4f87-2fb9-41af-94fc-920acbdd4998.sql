
CREATE TABLE public.recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_progress_id uuid REFERENCES public.period_goal_progress(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  metric_label text,
  metric_value text,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX recognitions_unique_goal_per_recipient
  ON public.recognitions(recipient_user_id, goal_progress_id)
  WHERE goal_progress_id IS NOT NULL;

CREATE INDEX recognitions_recipient_pending_idx
  ON public.recognitions(recipient_user_id) WHERE seen_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.recognitions TO authenticated;
GRANT ALL ON public.recognitions TO service_role;

ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their own recognitions"
  ON public.recognitions FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Admins can view all recognitions"
  ON public.recognitions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert recognitions"
  ON public.recognitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE POLICY "Recipients can mark their own as seen"
  ON public.recognitions FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());
