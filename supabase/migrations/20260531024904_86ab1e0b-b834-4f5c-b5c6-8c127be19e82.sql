-- Habilitar Realtime para as tabelas do Painel TV
BEGIN;
  -- Adicionar tabelas à publicação supabase_realtime
  -- Se as tabelas já estiverem lá, o erro será ignorado ou podemos usar a sintaxe correta
  -- No Supabase, o padrão é a publicação 'supabase_realtime' existir.
  
  -- Para garantir que não falhe se já estiver lá, poderíamos fazer algo mais complexo, 
  -- mas geralmente em migrações queremos que seja idempotente.
  
  -- Como o erro anterior mostrou que DROP TABLE IF EXISTS falhou, vamos apenas tentar ADD TABLE individualmente.
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_leads;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_calls;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leads_distribution;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.period_goals;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.period_goal_progress;
COMMIT;