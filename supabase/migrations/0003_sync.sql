-- Sync-back support: a light comments-only fetch for polling, and an
-- owner delete. Both password-gated through the existing helper.

-- Comments only (cheaper than get_share, which also ships the full html).
create or replace function public.list_comments(p_share_id text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v jsonb;
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
    into v
    from public.comments c where c.share_id = p_share_id;
  return v;
end $$;

-- Owner delete (password-gated).
create or replace function public.delete_comment(
  p_share_id   text,
  p_password   text,
  p_comment_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  delete from public.comments where id = p_comment_id and share_id = p_share_id;
end $$;

grant execute on function public.list_comments(text, text)        to anon, authenticated;
grant execute on function public.delete_comment(text, text, uuid) to anon, authenticated;
