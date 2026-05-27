-- Revoke public access from sensitive functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_meeting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_occupied_slots(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_delete_meeting_time() FROM PUBLIC, anon, authenticated;

-- Grant access to necessary roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_admins_new_meeting() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trigger_push_notification() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_occupied_slots(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_delete_meeting_time() TO authenticated, service_role;
