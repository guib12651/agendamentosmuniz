-- Fix Realtime publication: ALTER PUBLICATION does not support IF EXISTS for tables inside the publication
-- We do it individually and handle errors if they were already removed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.meetings;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.period_goals;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.period_goal_progress;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- Fix Quotas, Companies and Bids permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotas TO authenticated;
GRANT ALL ON public.quotas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;

-- Refresh the policies for quotas
DROP POLICY IF EXISTS "Admins or owners can view quotas" ON public.quotas;
CREATE POLICY "Admins or owners can view quotas"
ON public.quotas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());
