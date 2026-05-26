-- Create companies table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quotas table
CREATE TABLE public.quotas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id),
    client_name TEXT NOT NULL,
    phone TEXT,
    group_number TEXT,
    quota_number TEXT,
    credit_value NUMERIC(15, 2),
    installment_value NUMERIC(15, 2),
    seller_id UUID REFERENCES public.profiles(id),
    seller_name TEXT,
    sale_id UUID REFERENCES public.meetings(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bids table
CREATE TABLE public.bids (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id),
    quota_id UUID REFERENCES public.quotas(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    bid_type TEXT NOT NULL, -- free, fixed, embedded
    bid_value NUMERIC(15, 2),
    percentage NUMERIC(5, 2),
    assembly_date DATE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, contemplated, not_contemplated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users (can be refined later if needed)
CREATE POLICY "Authenticated users can manage companies" ON public.companies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage quotas" ON public.quotas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage bids" ON public.bids FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON public.quotas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
