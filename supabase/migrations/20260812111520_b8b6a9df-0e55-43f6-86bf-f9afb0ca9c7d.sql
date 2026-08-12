-- 1. Revoke public execute for all remaining SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_meeting() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_occupied_slots(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_delete_meeting_time() FROM PUBLIC;

-- 2. Set search_path for all SECURITY DEFINER functions that don't have it (or to be safe, all of them)
ALTER FUNCTION public.notify_admins_new_meeting() SET search_path = public;
ALTER FUNCTION public.trigger_push_notification() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.get_occupied_slots(date) SET search_path = public;
ALTER FUNCTION public.check_delete_meeting_time() SET search_path = public;
ALTER FUNCTION public.append_to_status_history(uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_profile_role_sync() SET search_path = public;
ALTER FUNCTION public.validate_quota_ownership() SET search_path = public;

-- 3. Explicit grants to authenticated users for functions intended for application use
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_occupied_slots(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_delete_meeting_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_to_status_history(uuid, text) TO authenticated;

-- Note: Trigger functions (notify_admins_new_meeting, trigger_push_notification, handle_profile_role_sync, validate_quota_ownership)
-- are executed by the system/owner, but revoking PUBLIC is good practice to prevent direct calls.
