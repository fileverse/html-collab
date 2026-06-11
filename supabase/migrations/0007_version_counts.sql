-- Version comment counts: the version rail shows "vN · date · N comments" on
-- hover, so the versions list needs a per-version comment count. Add it to
-- get_share's versions array and provide a cheap list_versions for polling.

create or replace function public.get_share(
  p_share_id   text,
  p_password   text,
  p_version_no int default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_ver public.versions; v_comments jsonb; v_versions jsonb;
begin
  if not exists (select 1 from public.shares where id = p_share_id) then
    raise exception 'not_found';
  end if;
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;

  select * into v_ver from public.versions
   where share_id = p_share_id
     and version_no = coalesce(
       p_version_no,
       (select max(version_no) from public.versions where share_id = p_share_id)
     );
  if not found then raise exception 'version_not_found'; end if;

  select coalesce(jsonb_agg(
           (to_jsonb(c) - 'version_id') || jsonb_build_object('share_id', p_share_id)
           order by c.created_at), '[]'::jsonb)
    into v_comments
    from public.comments c where c.version_id = v_ver.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'version_no', x.version_no,
           'file_name', x.file_name,
           'created_at', x.created_at,
           'comment_count', (select count(*) from public.comments c where c.version_id = x.id))
           order by x.version_no), '[]'::jsonb)
    into v_versions
    from public.versions x where x.share_id = p_share_id;

  return jsonb_build_object(
    'file_name', v_ver.file_name,
    'html', v_ver.html,
    'version_no', v_ver.version_no,
    'versions', v_versions,
    'comments', v_comments
  );
end $$;

-- Cheap versions+counts fetch (no html), for the owner to keep the rail current.
create or replace function public.list_versions(p_share_id text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v jsonb;
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'version_no', x.version_no,
           'file_name', x.file_name,
           'created_at', x.created_at,
           'comment_count', (select count(*) from public.comments c where c.version_id = x.id))
           order by x.version_no), '[]'::jsonb)
    into v
    from public.versions x where x.share_id = p_share_id;
  return v;
end $$;

grant execute on function public.get_share(text, text, int)   to anon, authenticated;
grant execute on function public.list_versions(text, text)    to anon, authenticated;
