
-- Fix overly permissive / public-role policies

-- period_goals: remove insecure public-role policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.period_goals;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.period_goals;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.period_goals;

-- period_goal_progress: remove insecure public-role policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.period_goal_progress;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.period_goal_progress;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.period_goal_progress;

-- Authenticated read on period_goal_progress already exists ("Authenticated users can read all progress").
-- Restrict period_goals read to authenticated (already exists as "Authenticated read goals").

-- operational_leads: scope policies to authenticated
DROP POLICY IF EXISTS "Users can view operational_leads" ON public.operational_leads;
DROP POLICY IF EXISTS "Admins can manage operational_leads" ON public.operational_leads;

CREATE POLICY "Authenticated can view operational_leads"
ON public.operational_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage operational_leads"
ON public.operational_leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- leads_distribution: scope policies to authenticated
DROP POLICY IF EXISTS "Users can view leads_distribution" ON public.leads_distribution;
DROP POLICY IF EXISTS "Admins can manage leads_distribution" ON public.leads_distribution;

CREATE POLICY "Authenticated can view leads_distribution"
ON public.leads_distribution FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage leads_distribution"
ON public.leads_distribution FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- calls: scope policies to authenticated
DROP POLICY IF EXISTS "Users can view their own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can insert their own calls" ON public.calls;

CREATE POLICY "Users can view their own calls"
ON public.calls FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own calls"
ON public.calls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- time_blocks: remove overly permissive authenticated policies (admin-only remain)
DROP POLICY IF EXISTS "Authenticated can create blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated can update blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated can delete blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated can view blocks" ON public.time_blocks;
-- "Todos podem ver bloqueios" SELECT policy remains for authenticated.

-- Ensure update_updated_at_column has a fixed search_path if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public';
  END IF;
END$$;
