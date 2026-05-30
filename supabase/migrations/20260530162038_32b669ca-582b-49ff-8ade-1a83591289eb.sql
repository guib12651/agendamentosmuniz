-- Adicionar coluna para histórico de status
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS status_history TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Inicializar o histórico com o status atual para registros existentes que ainda não têm histórico
UPDATE public.meetings 
SET status_history = ARRAY[status] 
WHERE status_history = ARRAY[]::TEXT[] AND status IS NOT NULL;
