-- Alter period_goals table to make month nullable
ALTER TABLE public.period_goals ALTER COLUMN month DROP NOT NULL;

-- Also check period_goal_progress just in case
ALTER TABLE public.period_goal_progress ALTER COLUMN month DROP NOT NULL;