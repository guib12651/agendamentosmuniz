REVOKE EXECUTE ON FUNCTION public.check_delete_meeting_time() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_profile_role_sync() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_meeting() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_quota_ownership() FROM authenticated, anon, public;