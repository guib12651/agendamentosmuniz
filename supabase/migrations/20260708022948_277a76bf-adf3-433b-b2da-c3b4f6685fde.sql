
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responsible_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  interest TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  desired_credit_value NUMERIC,
  desired_installment NUMERIC,
  available_down_payment NUMERIC,
  has_restriction TEXT,
  profession TEXT,
  income NUMERIC,
  decides_alone TEXT,
  next_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_responsible ON public.leads(responsible_user_id);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_leads_normalized_phone ON public.leads(normalized_phone);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_is_archived ON public.leads(is_archived);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own leads or admin views all"
  ON public.leads FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR responsible_user_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Users insert leads assigned to self or admin any"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR responsible_user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own leads or admin updates all"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR responsible_user_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR responsible_user_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Only admin can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id);

GRANT SELECT, INSERT ON public.lead_history TO authenticated;
GRANT ALL ON public.lead_history TO service_role;

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history if can view lead"
  ON public.lead_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_history.lead_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR l.responsible_user_id = auth.uid()
          OR l.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "Insert history for accessible leads"
  ON public.lead_history FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_history.lead_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR l.responsible_user_id = auth.uid()
          OR l.created_by = auth.uid()
        )
    )
  );
