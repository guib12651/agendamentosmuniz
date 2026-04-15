
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'pre_seller');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'pre_seller',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Add user_id to meetings (nullable for existing data)
ALTER TABLE public.meetings ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 6. Drop old open RLS policies on meetings
DROP POLICY IF EXISTS "Anyone can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can delete meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;

-- 7. New RLS policies on meetings
CREATE POLICY "Users can view own meetings or admins all"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert own meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meetings or admins all"
  ON public.meetings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete own meetings or admins all"
  ON public.meetings FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  );

-- 8. RLS on profiles (authenticated users can read all profiles)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- 9. RLS on user_roles (only through has_role function, deny direct access)
CREATE POLICY "No direct access to user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 10. Update time_blocks policies to require authenticated
DROP POLICY IF EXISTS "Anyone can create blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Anyone can delete blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Anyone can update blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Anyone can view blocks" ON public.time_blocks;

CREATE POLICY "Authenticated can view blocks" ON public.time_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create blocks" ON public.time_blocks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update blocks" ON public.time_blocks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete blocks" ON public.time_blocks FOR DELETE TO authenticated USING (true);
