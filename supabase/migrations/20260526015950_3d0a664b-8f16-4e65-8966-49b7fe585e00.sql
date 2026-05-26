
-- 1. Calls: add UPDATE/DELETE policies
CREATE POLICY "Users can update their own calls or admins all"
ON public.calls FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own calls or admins all"
ON public.calls FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Notifications: restrict INSERT to admins
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Quotas, companies, bids: replace public+auth.role() with authenticated targeting
DROP POLICY IF EXISTS "Authenticated users can manage quotas" ON public.quotas;
CREATE POLICY "Authenticated users can manage quotas"
ON public.quotas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;
CREATE POLICY "Authenticated users can manage companies"
ON public.companies FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage bids" ON public.bids;
CREATE POLICY "Authenticated users can manage bids"
ON public.bids FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. time_blocks: replace profiles.role check with has_role()
DROP POLICY IF EXISTS "Apenas admins podem inserir bloqueios" ON public.time_blocks;
DROP POLICY IF EXISTS "Apenas admins podem atualizar bloqueios" ON public.time_blocks;
DROP POLICY IF EXISTS "Apenas admins podem deletar bloqueios" ON public.time_blocks;

CREATE POLICY "Apenas admins podem inserir bloqueios"
ON public.time_blocks FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admins podem atualizar bloqueios"
ON public.time_blocks FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admins podem deletar bloqueios"
ON public.time_blocks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. sales_funnel_days: replace profiles.role check
DROP POLICY IF EXISTS "Admins podem gerenciar funnel_days" ON public.sales_funnel_days;
CREATE POLICY "Admins podem gerenciar funnel_days"
ON public.sales_funnel_days FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. sales_funnel_distribution: replace profiles.role check
DROP POLICY IF EXISTS "Admins podem gerenciar funnel_distribution" ON public.sales_funnel_distribution;
CREATE POLICY "Admins podem gerenciar funnel_distribution"
ON public.sales_funnel_distribution FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. daily_calls: replace profiles.role check and scope to authenticated
DROP POLICY IF EXISTS "Users can view their own daily calls" ON public.daily_calls;
DROP POLICY IF EXISTS "Users can insert their own daily calls" ON public.daily_calls;
DROP POLICY IF EXISTS "Users can update their own daily calls" ON public.daily_calls;
DROP POLICY IF EXISTS "Users can delete their own daily calls" ON public.daily_calls;

CREATE POLICY "Users can view their own daily calls"
ON public.daily_calls FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own daily calls"
ON public.daily_calls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily calls"
ON public.daily_calls FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own daily calls"
ON public.daily_calls FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
