CREATE POLICY "Users can view their own MIA logs"
ON public.mia_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Pre-vendas podem inserir seu próprio funil"
ON public.sales_funnel_distribution
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());