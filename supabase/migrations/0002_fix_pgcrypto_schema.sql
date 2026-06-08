-- pgcrypto lives in the `extensions` schema on Supabase, not `public`. Our
-- SECURITY DEFINER functions pin search_path=public for safety, so we must
-- schema-qualify crypt()/gen_salt()/gen_random_bytes() explicitly.

-- 1) share id default (table already created with the unqualified default)
alter table public.shares
  alter column id set default encode(extensions.gen_random_bytes(6), 'hex');

-- 2) password hashing
create or replace function public.check_share_password(p_share_id text, p_password text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_hash text;
begin
  select password_hash into v_hash from public.shares where id = p_share_id;
  if not found then return false; end if;
  if v_hash is null then return true; end if;
  return v_hash = extensions.crypt(coalesce(p_password, ''), v_hash);
end $$;

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
         else extensions.crypt(p_password, extensions.gen_salt('bf')) end
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

grant execute on function public.create_share(text, text, text, jsonb) to anon, authenticated;
