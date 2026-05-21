-- Renomear tabelas
ALTER TABLE IF EXISTS public.monthly_goals RENAME TO period_goals;
ALTER TABLE IF EXISTS public.monthly_goal_progress RENAME TO period_goal_progress;

-- Adicionar colunas de período na tabela de metas
ALTER TABLE public.period_goals ADD COLUMN start_date DATE;
ALTER TABLE public.period_goals ADD COLUMN end_date DATE;

-- Migrar dados existentes (usar o primeiro dia do mês como início e o último como fim)
UPDATE public.period_goals SET start_date = month, end_date = (month + interval '1 month' - interval '1 day')::date WHERE start_date IS NULL;

-- Tornar as novas colunas obrigatórias após a migração
ALTER TABLE public.period_goals ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.period_goals ALTER COLUMN end_date SET NOT NULL;

-- Remover a coluna antiga 'month' (opcional, mas recomendado para evitar confusão)
-- ALTER TABLE public.period_goals DROP COLUMN month;

-- Adicionar colunas de período na tabela de progresso
ALTER TABLE public.period_goal_progress ADD COLUMN start_date DATE;
ALTER TABLE public.period_goal_progress ADD COLUMN end_date DATE;

-- Migrar dados existentes no progresso
UPDATE public.period_goal_progress SET start_date = month, end_date = (month + interval '1 month' - interval '1 day')::date WHERE start_date IS NULL;

ALTER TABLE public.period_goal_progress ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.period_goal_progress ALTER COLUMN end_date SET NOT NULL;

-- Atualizar índices e constraints
ALTER TABLE public.period_goals DROP CONSTRAINT IF EXISTS monthly_goals_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_period_goals_dates ON public.period_goals(start_date, end_date);

ALTER TABLE public.period_goal_progress DROP CONSTRAINT IF EXISTS monthly_goal_progress_month_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_period_goal_progress_dates_user ON public.period_goal_progress(start_date, end_date, user_id);

-- Reabilitar RLS (já deve estar habilitado, mas para garantir que as novas tabelas funcionem)
ALTER TABLE public.period_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_goal_progress ENABLE ROW LEVEL SECURITY;

-- Recriar políticas se necessário (normalmente elas seguem a renomeação da tabela no Supabase, mas vamos garantir)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.period_goals;
CREATE POLICY "Enable read access for all users" ON public.period_goals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.period_goals;
CREATE POLICY "Enable insert for admins only" ON public.period_goals FOR INSERT WITH CHECK (true); -- Controle real será na aplicação via isAdmin

DROP POLICY IF EXISTS "Enable update for admins only" ON public.period_goals;
CREATE POLICY "Enable update for admins only" ON public.period_goals FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.period_goal_progress;
CREATE POLICY "Enable read access for all users" ON public.period_goal_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for admins only" ON public.period_goal_progress;
CREATE POLICY "Enable insert for admins only" ON public.period_goal_progress FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for admins only" ON public.period_goal_progress;
CREATE POLICY "Enable update for admins only" ON public.period_goal_progress FOR UPDATE USING (true);
