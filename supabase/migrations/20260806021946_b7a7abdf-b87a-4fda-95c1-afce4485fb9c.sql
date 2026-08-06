-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Admins can insert recognitions" ON public.recognitions;

-- Allow any authenticated user to insert a recognition as long as they are the sender (admin_user_id)
CREATE POLICY "Users can insert recognitions"
ON public.recognitions
FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

-- Ensure recipients can view their own recognitions (already exists, but reinforcing)
DROP POLICY IF EXISTS "Recipients can view their own recognitions" ON public.recognitions;
CREATE POLICY "Recipients can view their own recognitions"
ON public.recognitions
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- Allow admins to see all recognitions for auditing (already exists)
DROP POLICY IF EXISTS "Admins can view all recognitions" ON public.recognitions;
CREATE POLICY "Admins can view all recognitions"
ON public.recognitions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Grant access (precautionary)
GRANT SELECT, INSERT, UPDATE ON public.recognitions TO authenticated;
GRANT ALL ON public.recognitions TO service_role;
