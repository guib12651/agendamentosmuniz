-- Monthly goals tables
CREATE TABLE public.monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_goal numeric NOT NULL DEFAULT 0,
  split_count integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.monthly_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, user_id)
);

ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goal_progress ENABLE ROW LEVEL SECURITY;

-- monthly_goals: all auth read; admin writes
CREATE POLICY "Authenticated read goals"
  ON public.monthly_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert goals"
  ON public.monthly_goals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update goals"
  ON public.monthly_goals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete goals"
  ON public.monthly_goals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- monthly_goal_progress: user reads own; admin reads all; admin writes all
CREATE POLICY "User read own progress or admin all"
  ON public.monthly_goal_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert progress"
  ON public.monthly_goal_progress FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update progress"
  ON public.monthly_goal_progress FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete progress"
  ON public.monthly_goal_progress FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_goal_progress;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_monthly_goals_updated
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_goal_progress_updated
  BEFORE UPDATE ON public.monthly_goal_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();