-- Ensure has_role is robust
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- QUOTAS: explicit casting
DROP POLICY IF EXISTS "Admins or owners can view quotas" ON public.quotas;
DROP POLICY IF EXISTS "Admins or owners can insert quotas" ON public.quotas;
DROP POLICY IF EXISTS "Admins or owners can update quotas" ON public.quotas;
DROP POLICY IF EXISTS "Admins can delete quotas" ON public.quotas;

CREATE POLICY "Admins or owners can view quotas"
ON public.quotas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR seller_id = auth.uid());

CREATE POLICY "Admins or owners can insert quotas"
ON public.quotas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR seller_id = auth.uid());

CREATE POLICY "Admins or owners can update quotas"
ON public.quotas FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR seller_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR seller_id = auth.uid());

CREATE POLICY "Admins can delete quotas"
ON public.quotas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- BIDS: explicit casting
DROP POLICY IF EXISTS "Authenticated can view bids" ON public.bids;
DROP POLICY IF EXISTS "Admins can insert bids" ON public.bids;
DROP POLICY IF EXISTS "Admins can update bids" ON public.bids;
DROP POLICY IF EXISTS "Admins can delete bids" ON public.bids;

CREATE POLICY "Authenticated can view bids"
ON public.bids FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert bids"
ON public.bids FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update bids"
ON public.bids FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete bids"
ON public.bids FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- COMPANIES: explicit casting
DROP POLICY IF EXISTS "Authenticated can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;

CREATE POLICY "Authenticated can view companies"
ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- REALTIME: re-add tables to publication
-- While it's better for security to keep them out, if the frontend relies on them, 
-- we should rely on RLS instead which is also enforced for realtime.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.period_goals; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.period_goal_progress; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;