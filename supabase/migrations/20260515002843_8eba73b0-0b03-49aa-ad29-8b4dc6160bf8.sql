-- Drop the restrictive policy
DROP POLICY IF EXISTS "User read own progress or admin all" ON public.monthly_goal_progress;

-- Create a new policy that allows all authenticated users to read all progress
CREATE POLICY "Authenticated users can read all progress"
ON public.monthly_goal_progress
FOR SELECT
TO authenticated
USING (true);