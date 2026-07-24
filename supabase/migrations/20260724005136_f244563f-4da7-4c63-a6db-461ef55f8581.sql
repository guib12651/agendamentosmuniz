
-- 1) user_roles: allow admins to read all role rows
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) quotas: harden ownership
ALTER TABLE public.quotas ALTER COLUMN seller_id SET NOT NULL;

-- Validate that when sale_id is provided, the referenced meeting belongs to the seller (or actor is admin)
CREATE OR REPLACE FUNCTION public.validate_quota_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meeting_owner uuid;
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admins must set seller_id to themselves
  IF NEW.seller_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'seller_id must match the authenticated user';
  END IF;

  -- If a sale_id is provided, ensure the meeting belongs to the same seller
  IF NEW.sale_id IS NOT NULL THEN
    SELECT user_id INTO meeting_owner FROM public.meetings WHERE id = NEW.sale_id;
    IF meeting_owner IS NULL OR meeting_owner IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'sale_id must reference a meeting owned by the authenticated user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quota_ownership_trigger ON public.quotas;
CREATE TRIGGER validate_quota_ownership_trigger
BEFORE INSERT OR UPDATE ON public.quotas
FOR EACH ROW EXECUTE FUNCTION public.validate_quota_ownership();
