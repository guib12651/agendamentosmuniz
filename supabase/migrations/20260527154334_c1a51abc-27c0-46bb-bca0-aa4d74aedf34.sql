
-- Lock down profiles writes to admins only (prevents privilege escalation via role column)
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Explicit admin-only write policies for user_roles
CREATE POLICY "Admins can insert user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
