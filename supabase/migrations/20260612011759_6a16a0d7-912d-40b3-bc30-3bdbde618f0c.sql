CREATE TABLE public.mia_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    question TEXT NOT NULL,
    detected_intent TEXT,
    detected_domain TEXT,
    filters_used JSONB,
    success BOOLEAN DEFAULT true,
    response_summary TEXT,
    error_message TEXT
);

GRANT SELECT, INSERT ON public.mia_usage_logs TO authenticated;
GRANT ALL ON public.mia_usage_logs TO service_role;

ALTER TABLE public.mia_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all MIA logs" ON public.mia_usage_logs
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own MIA logs" ON public.mia_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
