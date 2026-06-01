DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
        CREATE TYPE public.opportunity_status AS ENUM ('not_contacted', 'answered', 'not_answered', 'scheduled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_user_id UUID REFERENCES public.profiles(id),
    assigned_user_name TEXT,
    lead_name TEXT,
    phone TEXT,
    city TEXT,
    opportunity_type TEXT,
    vehicle_or_property TEXT,
    desired_value TEXT,
    available_down_payment TEXT,
    desired_installment TEXT,
    notes TEXT,
    status public.opportunity_status NOT NULL DEFAULT 'not_contacted',
    import_source TEXT DEFAULT 'Meta Ads',
    created_by UUID REFERENCES public.profiles(id),
    last_interaction TIMESTAMP WITH TIME ZONE
);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view relevant opportunities"
ON public.opportunities
FOR SELECT
USING (
    (assigned_user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Managers can manage all opportunities"
ON public.opportunities
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Pre-sellers can update their assigned opportunities"
ON public.opportunities
FOR UPDATE
USING (assigned_user_id = auth.uid())
WITH CHECK (assigned_user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
