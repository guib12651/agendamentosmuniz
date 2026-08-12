-- Secure SECURITY DEFINER functions
-- 1. Revoke public execute
REVOKE EXECUTE ON FUNCTION public.append_to_status_history(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_profile_role_sync() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_quota_ownership() FROM PUBLIC;

-- 2. Set search_path
ALTER FUNCTION public.append_to_status_history(uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_profile_role_sync() SET search_path = public;
ALTER FUNCTION public.validate_quota_ownership() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 3. Explicit grants for internal functions
GRANT EXECUTE ON FUNCTION public.append_to_status_history(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_profile_role_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_quota_ownership() TO authenticated;
