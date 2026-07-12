alter function public.set_updated_at() set search_path = '';

alter function public.handle_new_user() set search_path = '';

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
