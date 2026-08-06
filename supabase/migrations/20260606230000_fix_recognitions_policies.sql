-- Relax recognition insert policy to allow any authenticated user to trigger one
-- as long as they identify as the sender.
DROP POLICY IF EXISTS "Admins can insert recognitions" ON public.recognitions;

CREATE POLICY "Users can insert recognitions"
ON public.recognitions
FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

-- Ensure all authenticated users can see their own recognitions 
-- (Already exists but good to confirm)
-- "Recipients can view their own recognitions" is already there.

-- We also need to make sure profiles are readable so the overlay can show name/avatar
-- "Public profiles are viewable by everyone" usually exists, but let's check.
