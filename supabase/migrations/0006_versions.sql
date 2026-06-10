-- Versioning: a share is now a "project" that holds 1–3 immutable version
-- snapshots (review rounds). Each version owns its own HTML + its own comments,
-- so v2 starts a fresh review after v1's feedback was applied. The link is
-- stable; reviewers see the latest version and can switch to older ones.
--
-- The DB was wiped before this migration, so there is no data to migrate —
-- we move `html` out of `shares` into `versions` and repoint `comments`.

-- ---------------------------------------------------------------------------
-- versions
-- ---------------------------------------------------------------------------
create table if not exists public.versions (
  id          text primary key default encode(extensions.gen_random_bytes(6), 'hex'),
  share_id    text not null references public.shares(id) on delete cascade,
  version_no  int  not null,
  file_name   text not null,
  html        text not null,
  created_at  timestamptz not null default now(),
  unique (share_id, version_no)
);
create index if not exists versions_share_idx on public.versions(share_id);
alter table public.versions enable row level security; -- no policies; RPCs only

-- shares no longer carries html (it lives per-version now)
alter table public.shares drop column if exists html;

-- comments now belong to a version, not directly to a share
alter table public.comments drop constraint if exists comments_share_id_fkey;
drop index if exists public.comments_share_idx;
alter table public.comments drop column if exists share_id;
alter table public.comments add column if not exists version_id text
  references public.versions(id) on delete cascade;
create index if not exists comments_version_idx on public.comments(version_id);

-- ---------------------------------------------------------------------------
-- helper: serialize a comment row the way the client expects (share_id, no
-- internal version_id). p_share_id is passed through for the client's docId.
-- ---------------------------------------------------------------------------
-- (inlined per-RPC below to keep a single round-trip)

-- ---------------------------------------------------------------------------
-- create_share: share + version 1 (+ any migrated local comments on v1)
-- ---------------------------------------------------------------------------
create or replace function public.create_share(
  p_file_name text,
  p_html      text,
  p_password  text,
  p_comments  jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id    text;
  v_token text;
  v_ver   text;
  c       jsonb;
begin
  insert into public.shares(file_name, password_hash)
  values (
    p_file_name,
    case when p_password is null or p_password = '' then null
         else extensions.crypt(p_password, extensions.gen_salt('bf')) end
  )
  returning id, owner_token into v_id, v_token;

  insert into public.versions(share_id, version_no, file_name, html)
  values (v_id, 1, p_file_name, p_html)
  returning id into v_ver;

  for c in select * from jsonb_array_elements(coalesce(p_comments, '[]'::jsonb))
  loop
    insert into public.comments(version_id, author, anchor, "offset", body, resolved)
    values (
      v_ver,
      coalesce(nullif(c->>'author', ''), 'Anonymous'),
      c->'anchor',
      c->'offset',
      coalesce(c->>'body', ''),
      coalesce((c->>'resolved')::boolean, false)
    );
  end loop;

  return jsonb_build_object('id', v_id, 'owner_token', v_token);
end $$;

-- ---------------------------------------------------------------------------
-- add_version: owner uploads the next version (max 3). Returns its number.
-- ---------------------------------------------------------------------------
create or replace function public.add_version(
  p_share_id    text,
  p_owner_token text,
  p_file_name   text,
  p_html        text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_count int; v_no int;
begin
  if not exists (select 1 from public.shares where id = p_share_id and owner_token = p_owner_token) then
    raise exception 'not_owner';
  end if;
  select count(*) into v_count from public.versions where share_id = p_share_id;
  if v_count >= 3 then raise exception 'max_versions'; end if;
  select coalesce(max(version_no), 0) + 1 into v_no
    from public.versions where share_id = p_share_id;
  insert into public.versions(share_id, version_no, file_name, html)
  values (p_share_id, v_no, p_file_name, p_html);
  return jsonb_build_object('version_no', v_no);
end $$;

-- ---------------------------------------------------------------------------
-- delete_version: owner removes a version (comments cascade). Remaining
-- versions are renumbered 1..n. Deleting the last one removes the share.
-- ---------------------------------------------------------------------------
create or replace function public.delete_version(
  p_share_id    text,
  p_owner_token text,
  p_version_no  int
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_remaining int;
begin
  if not exists (select 1 from public.shares where id = p_share_id and owner_token = p_owner_token) then
    raise exception 'not_owner';
  end if;

  delete from public.versions where share_id = p_share_id and version_no = p_version_no;

  -- renumber survivors to a contiguous 1..n (offset first to dodge the
  -- unique(share_id, version_no) constraint during the reassignment)
  update public.versions set version_no = version_no + 1000 where share_id = p_share_id;
  with ordered as (
    select id, row_number() over (order by created_at) as rn
      from public.versions where share_id = p_share_id
  )
  update public.versions v set version_no = o.rn from ordered o where v.id = o.id;

  select count(*) into v_remaining from public.versions where share_id = p_share_id;
  if v_remaining = 0 then
    delete from public.shares where id = p_share_id;
  end if;
  return jsonb_build_object('remaining', v_remaining, 'share_deleted', v_remaining = 0);
end $$;

-- ---------------------------------------------------------------------------
-- get_share: a version's html + comments, plus the full version list for the
-- switcher. p_version_no null => latest. Password-gated.
-- ---------------------------------------------------------------------------
drop function if exists public.get_share(text, text);
create function public.get_share(
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
           'version_no', x.version_no, 'file_name', x.file_name, 'created_at', x.created_at)
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

-- ---------------------------------------------------------------------------
-- add_comment: onto a specific version (password-gated).
-- ---------------------------------------------------------------------------
drop function if exists public.add_comment(text, text, text, jsonb, jsonb, text);
create function public.add_comment(
  p_share_id   text,
  p_password   text,
  p_version_no int,
  p_author     text,
  p_anchor     jsonb,
  p_offset     jsonb,
  p_body       text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_ver_id text; v public.comments;
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  select id into v_ver_id from public.versions
   where share_id = p_share_id and version_no = p_version_no;
  if v_ver_id is null then raise exception 'version_not_found'; end if;

  insert into public.comments(version_id, author, anchor, "offset", body)
  values (v_ver_id, coalesce(nullif(p_author, ''), 'Anonymous'), p_anchor, p_offset, p_body)
  returning * into v;
  return (to_jsonb(v) - 'version_id') || jsonb_build_object('share_id', p_share_id);
end $$;

-- ---------------------------------------------------------------------------
-- list_comments: comments for one version (cheap polling).
-- ---------------------------------------------------------------------------
drop function if exists public.list_comments(text, text);
create function public.list_comments(
  p_share_id   text,
  p_password   text,
  p_version_no int
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_ver_id text; v jsonb;
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  select id into v_ver_id from public.versions
   where share_id = p_share_id and version_no = p_version_no;
  if v_ver_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(
           (to_jsonb(c) - 'version_id') || jsonb_build_object('share_id', p_share_id)
           order by c.created_at), '[]'::jsonb)
    into v
    from public.comments c where c.version_id = v_ver_id;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- resolve / delete a comment — now verify it belongs to a version of the share
-- ---------------------------------------------------------------------------
create or replace function public.set_comment_resolved(
  p_share_id   text,
  p_password   text,
  p_comment_id uuid,
  p_resolved   boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  update public.comments set resolved = p_resolved
   where id = p_comment_id
     and version_id in (select id from public.versions where share_id = p_share_id);
end $$;

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
  delete from public.comments
   where id = p_comment_id
     and version_id in (select id from public.versions where share_id = p_share_id);
end $$;

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant execute on function public.create_share(text, text, text, jsonb)            to anon, authenticated;
grant execute on function public.add_version(text, text, text, text)              to anon, authenticated;
grant execute on function public.delete_version(text, text, int)                  to anon, authenticated;
grant execute on function public.get_share(text, text, int)                       to anon, authenticated;
grant execute on function public.add_comment(text, text, int, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.list_comments(text, text, int)                   to anon, authenticated;
grant execute on function public.set_comment_resolved(text, text, uuid, boolean)  to anon, authenticated;
grant execute on function public.delete_comment(text, text, uuid)                 to anon, authenticated;
