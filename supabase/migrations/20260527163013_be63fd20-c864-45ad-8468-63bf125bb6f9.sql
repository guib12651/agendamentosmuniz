
-- QUOTAS: restrict to admin or owner
DROP POLICY IF EXISTS "Authenticated users can manage quotas" ON public.quotas;

CREATE POLICY "Admins or owners can view quotas"
ON public.quotas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Admins or owners can insert quotas"
ON public.quotas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Admins or owners can update quotas"
ON public.quotas FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Admins can delete quotas"
ON public.quotas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- BIDS: read for authenticated, writes admin-only
DROP POLICY IF EXISTS "Authenticated users can manage bids" ON public.bids;

CREATE POLICY "Authenticated can view bids"
ON public.bids FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert bids"
ON public.bids FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bids"
ON public.bids FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bids"
ON public.bids FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- COMPANIES: read for authenticated, writes admin-only
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;

CREATE POLICY "Authenticated can view companies"
ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- REALTIME: remove sensitive tables from broadcast so a subscriber cannot
-- receive other users' rows that bypass table-level RLS through change events.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.meetings; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.period_goals; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.period_goal_progress; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
