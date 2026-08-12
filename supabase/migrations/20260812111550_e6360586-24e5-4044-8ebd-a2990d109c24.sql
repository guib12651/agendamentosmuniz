-- Secure all SECURITY DEFINER functions in the public schema
-- 1. Remove all existing execution privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.notify_admins_new_meeting() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.append_to_status_history(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_push_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_occupied_slots(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_profile_role_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_delete_meeting_time() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_quota_ownership() FROM PUBLIC, anon, authenticated;

-- 2. Explicitly grant EXECUTE only to roles that actually need to call them from the client
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_occupied_slots(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_delete_meeting_time() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_to_status_history(uuid, text) TO authenticated, service_role;

-- 3. Trigger functions only need service_role/owner access
GRANT EXECUTE ON FUNCTION public.notify_admins_new_meeting() TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_push_notification() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_profile_role_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_quota_ownership() TO service_role;

-- 4. Ensure search_path is set for all of them to prevent search_path hijacking
ALTER FUNCTION public.notify_admins_new_meeting() SET search_path = public;
ALTER FUNCTION public.append_to_status_history(uuid, text) SET search_path = public;
ALTER FUNCTION public.trigger_push_notification() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.get_occupied_slots(date) SET search_path = public;
ALTER FUNCTION public.handle_profile_role_sync() SET search_path = public;
ALTER FUNCTION public.check_delete_meeting_time() SET search_path = public;
ALTER FUNCTION public.validate_quota_ownership() SET search_path = public;
