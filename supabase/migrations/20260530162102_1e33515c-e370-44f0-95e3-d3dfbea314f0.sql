CREATE OR REPLACE FUNCTION public.append_to_status_history(_meeting_id UUID, _new_status TEXT)
RETURNS TEXT[] AS $$
DECLARE
  current_history TEXT[];
BEGIN
  SELECT status_history INTO current_history FROM public.meetings WHERE id = _meeting_id;
  
  -- Se o novo status não estiver no histórico, adiciona
  IF NOT (_new_status = ANY(current_history)) THEN
    current_history := array_append(current_history, _new_status);
  END IF;
  
  RETURN current_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar funções de store para usar a coluna status_history corretamente se necessário
-- (Embora já tenhamos planejado usar via RPC ou manualmente no store.ts)
