-- Add status column to period_goals
ALTER TABLE public.period_goals 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'));

-- Add an index for status for better performance if needed, though the table is small
CREATE INDEX idx_period_goals_status ON public.period_goals(status);
