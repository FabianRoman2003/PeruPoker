-- ============================================================
--  PeruPoker — Esquema Supabase
--  Texas Hold'em cash, ciegas 1/2, cajas de 20 Bs, SIN login.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================
create extension if not exists "pgcrypto";

-- La mesa de esta noche
create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  room_code          text unique not null,         -- "POKER-4821" para unirse
  admin_device       text not null,                -- device del admin (tú)
  box_value          int  not null default 20,     -- valor de la caja en Bs
  small_blind        int  not null default 1,
  big_blind          int  not null default 2,
  shot_clock_seconds int  not null default 30,
  button_seat        int,                           -- asiento con el botón
  acting_seat        int,                           -- asiento en acción (reloj)
  turn_started_at    timestamptz,                   -- para sincronizar el reloj
  timer_paused       boolean not null default true,
  timer_remaining    int,
  hand_number        int  not null default 0,
  status             text not null default 'abierta', -- abierta | cerrada
  created_at         timestamptz not null default now()
);

-- Los 9 asientos / jugadores
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  seat_number int  not null,
  name        text not null,
  status      text not null default 'juega',        -- juega | descansa | solo_reparte
  device_id   text,                                  -- si vinculó su celular
  created_at  timestamptz not null default now(),
  unique (session_id, seat_number)
);

-- Cada recarga de caja (con hora = tu historial "quién recargó")
create table if not exists buyins (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions(id) on delete cascade,
  player_id        uuid not null references players(id) on delete cascade,
  amount           int  not null default 20,
  created_by_device text,
  created_at       timestamptz not null default now()
);

-- Fichas finales al cerrar la mesa
create table if not exists cashouts (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  chips_amount int  not null,
  created_at   timestamptz not null default now(),
  unique (session_id, player_id)
);

-- Permisos delegados (Operador = solo reloj + mesa)
create table if not exists access_grants (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  device_id  text not null,
  role       text not null default 'espectador',     -- operador | espectador
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, device_id)
);

-- Tiempo real: que los 9 celulares se actualicen solos
alter publication supabase_realtime add table sessions, players, buyins, cashouts, access_grants;

-- RLS — proyecto entre amigos, sin login: permisivo para el rol anon.
-- (Cuando quieras blindarlo, aquí se cambian las políticas.)
alter table sessions      enable row level security;
alter table players       enable row level security;
alter table buyins        enable row level security;
alter table cashouts      enable row level security;
alter table access_grants enable row level security;

create policy "anon_all" on sessions      for all to anon using (true) with check (true);
create policy "anon_all" on players       for all to anon using (true) with check (true);
create policy "anon_all" on buyins        for all to anon using (true) with check (true);
create policy "anon_all" on cashouts      for all to anon using (true) with check (true);
create policy "anon_all" on access_grants for all to anon using (true) with check (true);
