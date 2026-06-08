-- ai-feedback-loop · M5/M6 schema
-- Password-only shareable review links. RLS is enabled with NO policies, so the
-- anon key has zero direct table access; everything goes through SECURITY
-- DEFINER RPCs that enforce the share password. Passwords are bcrypt-hashed
-- (pgcrypto) and never leave the database.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table if not exists public.shares (
  id            text primary key default encode(gen_random_bytes(6), 'hex'),
  file_name     text not null,
  html          text not null,
  password_hash text,                 -- null => no password required
  created_at    timestamptz not null default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  share_id   text not null references public.shares(id) on delete cascade,
  author     text not null default 'Anonymous',
  anchor     jsonb not null,
  "offset"   jsonb not null,
  body       text not null,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_share_idx on public.comments(share_id);

alter table public.shares   enable row level security;
alter table public.comments enable row level security;
-- intentionally no policies: direct anon access is denied; use the RPCs below.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.check_share_password(p_share_id text, p_password text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_hash text;
begin
  select password_hash into v_hash from public.shares where id = p_share_id;
  if not found then return false; end if;
  if v_hash is null then return true; end if;            -- no password set
  return v_hash = crypt(coalesce(p_password, ''), v_hash);
end $$;

-- ---------------------------------------------------------------------------
-- rpcs (called from the browser with the anon key)
-- ---------------------------------------------------------------------------

-- Create a share from the current document + its local comments.
create or replace function public.create_share(
  p_file_name text,
  p_html      text,
  p_password  text,
  p_comments  jsonb default '[]'::jsonb
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_id text;
  c    jsonb;
begin
  insert into public.shares(file_name, html, password_hash)
  values (
    p_file_name,
    p_html,
    case when p_password is null or p_password = '' then null
         else crypt(p_password, gen_salt('bf')) end
  )
  returning id into v_id;

  for c in select * from jsonb_array_elements(coalesce(p_comments, '[]'::jsonb))
  loop
    insert into public.comments(share_id, author, anchor, "offset", body, resolved)
    values (
      v_id,
      coalesce(nullif(c->>'author', ''), 'Anonymous'),
      c->'anchor',
      c->'offset',
      coalesce(c->>'body', ''),
      coalesce((c->>'resolved')::boolean, false)
    );
  end loop;

  return v_id;
end $$;

-- Lightweight metadata for the password gate (never returns html/comments).
create or replace function public.share_meta(p_share_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v public.shares;
begin
  select * into v from public.shares where id = p_share_id;
  if not found then
    return jsonb_build_object('exists', false);
  end if;
  return jsonb_build_object(
    'exists', true,
    'requires_password', v.password_hash is not null,
    'file_name', v.file_name
  );
end $$;

-- Full document + comments, gated by password.
create or replace function public.get_share(p_share_id text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v public.shares; v_comments jsonb;
begin
  select * into v from public.shares where id = p_share_id;
  if not found then raise exception 'not_found'; end if;
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
    into v_comments
    from public.comments c where c.share_id = p_share_id;
  return jsonb_build_object('file_name', v.file_name, 'html', v.html, 'comments', v_comments);
end $$;

-- Add a comment to a shared doc (password-gated).
create or replace function public.add_comment(
  p_share_id text,
  p_password text,
  p_author   text,
  p_anchor   jsonb,
  p_offset   jsonb,
  p_body     text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v public.comments;
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  insert into public.comments(share_id, author, anchor, "offset", body)
  values (p_share_id, coalesce(nullif(p_author, ''), 'Anonymous'), p_anchor, p_offset, p_body)
  returning * into v;
  return to_jsonb(v);
end $$;

-- Toggle resolved (password-gated).
create or replace function public.set_comment_resolved(
  p_share_id  text,
  p_password  text,
  p_comment_id uuid,
  p_resolved  boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.check_share_password(p_share_id, p_password) then
    raise exception 'invalid_password';
  end if;
  update public.comments set resolved = p_resolved
   where id = p_comment_id and share_id = p_share_id;
end $$;

-- ---------------------------------------------------------------------------
-- grants — anon/authenticated may execute the RPCs (and nothing else)
-- ---------------------------------------------------------------------------
revoke all on function public.check_share_password(text, text) from public;
grant execute on function public.create_share(text, text, text, jsonb)        to anon, authenticated;
grant execute on function public.share_meta(text)                             to anon, authenticated;
grant execute on function public.get_share(text, text)                        to anon, authenticated;
grant execute on function public.add_comment(text, text, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.set_comment_resolved(text, text, uuid, boolean)   to anon, authenticated;
