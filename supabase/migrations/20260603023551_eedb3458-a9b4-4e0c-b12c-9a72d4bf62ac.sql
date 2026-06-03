-- Fix opportunities admin policy to use has_role()
DROP POLICY IF EXISTS "Admins can do everything on opportunities" ON public.opportunities;

CREATE POLICY "Admins can do everything on opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Remove meetings from Realtime publication to prevent broadcasting sensitive lead data
ALTER PUBLICATION supabase_realtime DROP TABLE public.meetings;