-- Recrea las funciones de login con search_path correcto (pgcrypto está en "extensions")
-- y refresca la caché de la API de Supabase (PostgREST).

create or replace function public.register_user(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare u text;
begin
  u := trim(p_username);
  if u = '' or length(p_password) < 3 then
    return 'error:datos';
  end if;
  if exists (select 1 from app_users where lower(username) = lower(u)) then
    return 'error:existe';
  end if;
  insert into app_users(username, pass_hash) values (u, crypt(p_password, gen_salt('bf')));
  return 'ok';
end;
$$;

create or replace function public.login_user(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare ok boolean;
begin
  select (pass_hash = crypt(p_password, pass_hash)) into ok
  from app_users
  where lower(username) = lower(trim(p_username));
  if ok is true then
    return 'ok';
  else
    return 'error:credenciales';
  end if;
end;
$$;

grant execute on function public.register_user(text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
