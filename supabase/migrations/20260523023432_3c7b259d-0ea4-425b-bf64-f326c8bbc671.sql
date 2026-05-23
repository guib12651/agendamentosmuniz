-- Table for captured leads
CREATE TABLE IF NOT EXISTS public.operational_leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    amount INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    observations TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for leads distribution
CREATE TABLE IF NOT EXISTS public.leads_distribution (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    amount INTEGER NOT NULL DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Employee receiving the leads
    source TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    observations TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL, -- Admin distributing the leads
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operational_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_distribution ENABLE ROW LEVEL SECURITY;

-- Policies for operational_leads
CREATE POLICY "Users can view operational_leads" 
ON public.operational_leads FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage operational_leads" 
ON public.operational_leads FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for leads_distribution
CREATE POLICY "Users can view leads_distribution" 
ON public.leads_distribution FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage leads_distribution" 
ON public.leads_distribution FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_operational_leads ON public.operational_leads;
CREATE TRIGGER set_updated_at_operational_leads BEFORE UPDATE ON public.operational_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_leads_distribution ON public.leads_distribution;
CREATE TRIGGER set_updated_at_leads_distribution BEFORE UPDATE ON public.leads_distribution FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_leads_date ON public.operational_leads(date);
CREATE INDEX IF NOT EXISTS idx_leads_distribution_date ON public.leads_distribution(date);
CREATE INDEX IF NOT EXISTS idx_leads_distribution_user ON public.leads_distribution(user_id);
