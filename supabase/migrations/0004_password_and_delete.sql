-- Share lifecycle: set/replace/disable the password, and delete the share.
-- Both gated by the CURRENT password via check_share_password (owner keeps it
-- locally). pgcrypto lives in the `extensions` schema on Supabase — qualify.

create or replace function public.set_share_password(
  p_share_id     text,
  p_password     text,
  p_new_password text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  update public.shares
     set password_hash = case
       when p_new_password is null or p_new_password = '' then null
       else extensions.crypt(p_new_password, extensions.gen_salt('bf'))
     end
   where id = p_share_id;
end $$;

create or replace function public.delete_share(p_share_id text, p_password text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  delete from public.shares where id = p_share_id; -- comments cascade
end $$;

grant execute on function public.set_share_password(text, text, text) to anon, authenticated;
grant execute on function public.delete_share(text, text)             to anon, authenticated;
