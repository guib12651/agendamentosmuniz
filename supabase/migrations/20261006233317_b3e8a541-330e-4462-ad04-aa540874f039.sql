DROP POLICY IF EXISTS "Authenticated can view bids" ON public.bids;
CREATE POLICY "Admins can view bids" ON public.bids FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated can view operational_leads" ON public.operational_leads;
CREATE POLICY "Admins can view operational_leads" ON public.operational_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated can view leads_distribution" ON public.leads_distribution;
CREATE POLICY "Own or admin can view leads_distribution" ON public.leads_distribution FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated users can read all progress" ON public.period_goal_progress;
CREATE POLICY "Own or admin can read progress" ON public.period_goal_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));