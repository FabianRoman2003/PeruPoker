-- ============================================================
--  PeruPoker — Login por usuario/contraseña (sin correo) + Salas en vivo
--  Ejecutar en: Supabase → SQL Editor → New query → pegar → Run
-- ============================================================
create extension if not exists pgcrypto;

-- Usuarios (la tabla NO es accesible directamente; solo vía funciones seguras)
create table if not exists app_users (
  username   text primary key,
  pass_hash  text not null,
  created_at timestamptz not null default now()
);
alter table app_users enable row level security;

-- Registro: crea el usuario si no existe (contraseña con bcrypt)
create or replace function register_user(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
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

-- Login: verifica usuario + contraseña
create or replace function login_user(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
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

grant execute on function register_user(text, text) to anon;
grant execute on function login_user(text, text) to anon;

-- Salas en vivo: el host guarda el estado completo (JSON) y todos lo ven (Realtime)
create table if not exists rooms (
  code       text primary key,
  state      jsonb not null,
  host       text,
  updated_at timestamptz not null default now()
);
alter table rooms enable row level security;
drop policy if exists "rooms_anon_all" on rooms;
create policy "rooms_anon_all" on rooms for all to anon using (true) with check (true);

-- Habilitar realtime en la tabla rooms (ignora error si ya está)
do $$
begin
  alter publication supabase_realtime add table rooms;
exception when others then null;
end $$;
