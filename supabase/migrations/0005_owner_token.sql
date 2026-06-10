-- Owner token: shares are now auto-created (often password-less), so password
-- checks alone can't gate destructive actions — any link holder would pass.
-- create_share returns a secret owner_token; set_share_password and
-- delete_share require it. Reading stays password-gated as before.

alter table public.shares
  add column if not exists owner_token text not null
    default encode(extensions.gen_random_bytes(16), 'hex');

-- return type changes from text to jsonb → drop and recreate
drop function if exists public.create_share(text, text, text, jsonb);

create function public.create_share(
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
  c       jsonb;
begin
  insert into public.shares(file_name, html, password_hash)
  values (
    p_file_name,
    p_html,
    case when p_password is null or p_password = '' then null
         else extensions.crypt(p_password, extensions.gen_salt('bf')) end
  )
  returning id, owner_token into v_id, v_token;

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

  return jsonb_build_object('id', v_id, 'owner_token', v_token);
end $$;

drop function if exists public.set_share_password(text, text, text);

create function public.set_share_password(
  p_share_id     text,
  p_owner_token  text,
  p_new_password text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_count int;
begin
  update public.shares
     set password_hash = case
       when p_new_password is null or p_new_password = '' then null
       else extensions.crypt(p_new_password, extensions.gen_salt('bf'))
     end
   where id = p_share_id and owner_token = p_owner_token;
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'not_owner'; end if;
end $$;

drop function if exists public.delete_share(text, text);

create function public.delete_share(p_share_id text, p_owner_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_count int;
begin
  delete from public.shares
   where id = p_share_id and owner_token = p_owner_token; -- comments cascade
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'not_owner'; end if;
end $$;

grant execute on function public.create_share(text, text, text, jsonb)     to anon, authenticated;
grant execute on function public.set_share_password(text, text, text)      to anon, authenticated;
grant execute on function public.delete_share(text, text)                  to anon, authenticated;
