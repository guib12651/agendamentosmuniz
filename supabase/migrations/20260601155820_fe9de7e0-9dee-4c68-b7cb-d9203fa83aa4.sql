-- Drop existing table and related types if they exist
DROP TABLE IF EXISTS public.opportunities CASCADE;

-- Create opportunities table
CREATE TABLE public.opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    assigned_user_id UUID REFERENCES public.profiles(id) NOT NULL,
    lead_name TEXT,
    phone TEXT,
    city TEXT,
    opportunity_type TEXT,
    vehicle_or_property TEXT,
    desired_value TEXT,
    desired_installment TEXT,
    available_down_payment TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    import_batch_id UUID,
    ocr_raw_text TEXT
);

-- Index for performance
CREATE INDEX idx_opportunities_assigned_user_id ON public.opportunities(assigned_user_id);
CREATE INDEX idx_opportunities_status ON public.opportunities(status);
CREATE INDEX idx_opportunities_created_at ON public.opportunities(created_at);

-- Set up RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

-- Policies
CREATE POLICY "Admins can do everything on opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Users can view their assigned opportunities"
ON public.opportunities
FOR SELECT
TO authenticated
USING (assigned_user_id = auth.uid());

CREATE POLICY "Users can update their assigned opportunities"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (assigned_user_id = auth.uid())
WITH CHECK (assigned_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
