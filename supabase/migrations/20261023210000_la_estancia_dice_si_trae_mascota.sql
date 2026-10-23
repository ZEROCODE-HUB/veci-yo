-- La estancia dice si trae mascota, cuántos vehículos vienen, y el huésped
-- registra sus mascotas.
--
-- QA 23/10/2026 (responsable de producto, filas 42 y 47):
--   · al crear la reserva, «poner opción de si trae mascota y añadir esa
--     opción al link de pre registro para añadir una mascota»;
--   · al editarla, «en personas solo editar la cantidad, lo mismo en
--     vehículos, y un switch de mascotas».
--
-- `vehiculos_previstos` es al vehículo lo que `huespedes_previstos` a la
-- persona: lo fija el anfitrión y el preregistro no pasa de ahí. Nulo, sin
-- tope propio (queda el de un vehículo por adulto).

alter table public.visita
  add column if not exists trae_mascota boolean not null default false,
  add column if not exists vehiculos_previstos int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'visita_vehiculos_previstos_no_negativos') then
    alter table public.visita
      add constraint visita_vehiculos_previstos_no_negativos
      check (vehiculos_previstos is null or vehiculos_previstos >= 0);
  end if;
end $$;

comment on column public.visita.trae_mascota is
  'El anfitrión dice que el huésped trae mascota; el preregistro le pide registrarla.';
comment on column public.visita.vehiculos_previstos is
  'Cuántos vehículos dijo el anfitrión que vienen. Nulo: sin tope propio.';

-- Las mascotas de una estancia.
create table if not exists public.mascota_visita (
  id          uuid primary key default gen_random_uuid(),
  visita_id   uuid not null references public.visita(id) on delete cascade,
  tipo        public.tipo_mascota not null,
  nombre      text not null check (length(btrim(nombre)) between 1 and 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.mascota_visita is
  'Las mascotas que trae un huésped. Las registra él en su preregistro; las ven '
  'el anfitrión y la portería.';

create index if not exists mascota_visita_visita_idx on public.mascota_visita (visita_id);

drop trigger if exists mascota_visita_tocar_updated_at on public.mascota_visita;
create trigger mascota_visita_tocar_updated_at
  before update on public.mascota_visita
  for each row execute function public.tocar_updated_at();

alter table public.mascota_visita enable row level security;

-- Quien ve la estancia ve sus mascotas. Nadie las escribe por la API: entran
-- por las funciones del preregistro (con el enlace del huésped).
drop policy if exists mascota_visita_lectura on public.mascota_visita;
create policy mascota_visita_lectura on public.mascota_visita
  for select using (public.puede_ver_visita(visita_id));

-- El tope de vehículos del anfitrión, además del de uno por adulto.
create or replace function public.vehiculos_no_pasan_de_los_adultos()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tipo      public.tipo_visita;
  v_previstos int;
  v_adultos   int;
  v_vehiculos int;
begin
  select v.tipo, v.vehiculos_previstos into v_tipo, v_previstos
  from public.visita v where v.id = new.visita_id;
  if v_tipo is distinct from 'huesped_temporal' then
    return new;
  end if;

  select count(*) into v_adultos
  from public.invitado i
  where i.visita_id = new.visita_id and not coalesce(i.es_menor, false);

  select count(*) into v_vehiculos
  from public.vehiculo_visita x
  where x.visita_id = new.visita_id;

  if v_previstos is not null and v_vehiculos >= v_previstos then
    raise exception 'Esta reserva es para % vehículo(s). Si traen otro, pídeselo al anfitrión.',
      v_previstos
      using errcode = 'check_violation';
  end if;

  if v_vehiculos >= greatest(v_adultos, 1) then
    raise exception 'Ya hay un vehículo por cada adulto de la reserva (%). Para otro vehículo, primero añade a la persona que lo trae.',
      greatest(v_adultos, 1)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Lo que el preregistro sabe de las mascotas: si trae, y cuáles registró.
create or replace function public.mascotas_del_precheckin(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select p.visita_id into v_visita from public.persona_del_enlace(p_token) p;
  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  return jsonb_build_object(
    'trae_mascota', (select trae_mascota from public.visita where id = v_visita),
    'mascotas', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'nombre', m.nombre) order by m.created_at)
      from public.mascota_visita m where m.visita_id = v_visita
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.guardar_mascota_precheckin(p_token text, p_tipo public.tipo_mascota, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_id     uuid;
begin
  select p.visita_id into v_visita from public.persona_del_enlace(p_token) p;
  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  if exists (select 1 from public.visita where id = v_visita and precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;
  if nullif(btrim(coalesce(p_nombre, '')), '') is null then
    raise exception 'Falta el nombre de la mascota';
  end if;
  insert into public.mascota_visita (visita_id, tipo, nombre)
  values (v_visita, p_tipo, btrim(p_nombre))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.quitar_mascota_precheckin(p_token text, p_mascota_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select p.visita_id into v_visita from public.persona_del_enlace(p_token) p;
  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  if exists (select 1 from public.visita where id = v_visita and precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;
  delete from public.mascota_visita where id = p_mascota_id and visita_id = v_visita;
end;
$$;

comment on function public.mascotas_del_precheckin(text) is
  'Si la estancia del enlace trae mascota y las mascotas registradas.';
comment on function public.guardar_mascota_precheckin(text, public.tipo_mascota, text) is
  'El huésped registra una mascota desde su enlace, mientras el preregistro esté abierto.';
comment on function public.quitar_mascota_precheckin(text, uuid) is
  'El huésped quita una mascota de su estancia, mientras el preregistro esté abierto.';

revoke all on function public.mascotas_del_precheckin(text) from public;
revoke all on function public.guardar_mascota_precheckin(text, public.tipo_mascota, text) from public;
revoke all on function public.quitar_mascota_precheckin(text, uuid) from public;
grant execute on function public.mascotas_del_precheckin(text) to anon, authenticated, service_role;
grant execute on function public.guardar_mascota_precheckin(text, public.tipo_mascota, text) to anon, authenticated, service_role;
grant execute on function public.quitar_mascota_precheckin(text, uuid) to anon, authenticated, service_role;
