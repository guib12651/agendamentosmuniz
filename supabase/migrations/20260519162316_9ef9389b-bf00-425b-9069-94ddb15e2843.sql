-- Adicionar coluna de etapa do funil à tabela de meetings
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'appointment' 
CHECK (funnel_stage IN ('appointment', 'visit', 'negotiation', 'sale'));

-- Comentário para documentação
COMMENT ON COLUMN public.meetings.funnel_stage IS 'Etapa atual do lead no funil de vendas: appointment, visit, negotiation ou sale';