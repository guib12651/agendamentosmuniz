-- Garantir que a função existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela para captados totais do dia (gerido pelo Admin)
CREATE TABLE IF NOT EXISTS public.sales_funnel_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_leads_captured INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para distribuição e métricas por pré-venda
CREATE TABLE IF NOT EXISTS public.sales_funnel_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID REFERENCES public.sales_funnel_days(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    leads_received INTEGER DEFAULT 0, -- Leads distribuídos pelo Admin
    calls_made INTEGER DEFAULT 0,     -- Ligações
    appointments_made INTEGER DEFAULT 0, -- Agendamentos
    visits_completed INTEGER DEFAULT 0, -- Visitas
    negotiations_started INTEGER DEFAULT 0, -- Negociações
    sales_completed INTEGER DEFAULT 0, -- Vendas (apenas Admin verá/editará)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(day_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.sales_funnel_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_funnel_distribution ENABLE ROW LEVEL SECURITY;

-- Remover políticas se existirem para evitar erro
DROP POLICY IF EXISTS "Todos podem ver funnel_days" ON public.sales_funnel_days;
DROP POLICY IF EXISTS "Admins podem gerenciar funnel_days" ON public.sales_funnel_days;
DROP POLICY IF EXISTS "Todos podem ver funnel_distribution" ON public.sales_funnel_distribution;
DROP POLICY IF EXISTS "Admins podem gerenciar funnel_distribution" ON public.sales_funnel_distribution;
DROP POLICY IF EXISTS "Pre-vendas podem atualizar seu próprio funil" ON public.sales_funnel_distribution;

-- Políticas para sales_funnel_days
CREATE POLICY "Todos podem ver funnel_days" ON public.sales_funnel_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem gerenciar funnel_days" ON public.sales_funnel_days FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Políticas para sales_funnel_distribution
CREATE POLICY "Todos podem ver funnel_distribution" ON public.sales_funnel_distribution FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem gerenciar funnel_distribution" ON public.sales_funnel_distribution FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Pre-vendas podem atualizar seu próprio funil" ON public.sales_funnel_distribution FOR UPDATE TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Triggers
DROP TRIGGER IF EXISTS update_sales_funnel_days_updated_at ON public.sales_funnel_days;
CREATE TRIGGER update_sales_funnel_days_updated_at BEFORE UPDATE ON public.sales_funnel_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_funnel_distribution_updated_at ON public.sales_funnel_distribution;
CREATE TRIGGER update_sales_funnel_distribution_updated_at BEFORE UPDATE ON public.sales_funnel_distribution FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();