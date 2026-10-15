/*
  El intercomunicador: llamadas por internet entre vivienda y porteria
  (14/10/2026).

  Lo pidio la responsable de producto («llamar de residencia a porteria como
  llamada entrante») y el cliente eligio que fuera **llamada real por
  internet**. La voz va por LiveKit (codigo abierto, en un servidor propio);
  aqui vive lo demas: quien llama a quien, si suena, si se contesto, y quien
  puede entrar a la sala.

  - `llamada_internet`: una fila por llamada, con su sala. Solo la ven quien
    llama y quien la recibe (la porteria del edificio, o los miembros de la
    vivienda). No se escribe directo: todo por funciones.
  - `llamar_por_internet`, `contestar_llamada`, `rechazar_llamada`,
    `colgar_llamada`.
  - La porteria llama y contesta **si la administracion le habilito las
    llamadas** (KT: «chat/llamadas si el Administrador se lo habilita»).
  - Entra en Realtime: asi suena la llamada entrante.

  Solo aditiva.
*/

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_intercom') then
    create type public.estado_intercom as enum ('sonando', 'en_curso', 'terminada', 'rechazada', 'perdida');
  end if;
  if not exists (select 1 from pg_type where typname = 'destino_intercom') then
    create type public.destino_intercom as enum ('porteria', 'vivienda');
  end if;
end $$;

create table if not exists public.llamada_internet (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  de_usuario_id  uuid not null references auth.users(id),
  de_unidad_id   uuid references public.unidad(id),
  destino        destino_intercom not null,
  a_unidad_id    uuid references public.unidad(id),
  sala           text not null unique default ('veciyo-' || gen_random_uuid()::text),
  estado         estado_intercom not null default 'sonando',
  contestada_por uuid references auth.users(id),
  contestada_en  timestamptz,
  terminada_en   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint llamada_internet_destino_coherente check (
    (destino = 'vivienda' and a_unidad_id is not null)
    or (destino = 'porteria' and a_unidad_id is null)
  ),
  constraint llamada_internet_contestada_con_quien check (
    contestada_en is null or contestada_por is not null
  )
);

comment on table public.llamada_internet is
  'Las llamadas del intercomunicador (vivienda <-> porteria). La voz va por LiveKit en la sala `sala`; aqui queda quien, cuando y en que acabo.';

create index if not exists llamada_internet_condominio_idx
  on public.llamada_internet (condominio_id, created_at desc);

drop trigger if exists llamada_internet_tocar_updated_at on public.llamada_internet;
create trigger llamada_internet_tocar_updated_at
  before update on public.llamada_internet
  for each row execute function public.tocar_updated_at();

alter table public.llamada_internet enable row level security;

-- La porteria con permiso de llamadas.
create or replace function public.porteria_puede_llamar(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.rol = 'guardia'
      and mc.activo
      and (mc.permisos ->> 'llamadas') = 'true'
  );
$$;

grant execute on function public.porteria_puede_llamar(uuid) to authenticated;

-- Quien esta en una llamada: quien llama, y quien la recibe.
create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or (l.destino = 'porteria' and public.porteria_puede_llamar(l.condominio_id))
        or (l.destino = 'vivienda' and public.es_miembro_unidad(l.a_unidad_id))
      )
  );
$$;

grant execute on function public.esta_en_la_llamada(uuid) to authenticated;

drop policy if exists llamada_internet_lectura on public.llamada_internet;
create policy llamada_internet_lectura on public.llamada_internet
  for select to authenticated
  using (public.esta_en_la_llamada(id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'llamada_internet'
  ) then
    alter publication supabase_realtime add table public.llamada_internet;
  end if;
end $$;

-- ----------------------------------------------------------------------------

create or replace function public.llamar_por_internet(
  p_destino         destino_intercom,
  p_a_unidad_id     uuid default null,
  p_desde_unidad_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_id         uuid;
begin
  if p_destino = 'porteria' then
    -- Una vivienda llama a la porteria de su edificio.
    if p_desde_unidad_id is null or not public.es_miembro_unidad(p_desde_unidad_id) then
      raise exception 'Solo se llama a la porteria desde una vivienda tuya';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
  else
    -- La porteria llama a una vivienda de su edificio.
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    v_condominio := public.condominio_de_unidad(p_a_unidad_id);
    if not public.porteria_puede_llamar(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    end if;
  end if;

  insert into public.llamada_internet (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.contestar_llamada(p_llamada_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null or l.de_usuario_id = auth.uid() or not public.esta_en_la_llamada(l.id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado <> 'sonando' then
    raise exception 'Esa llamada ya no está sonando';
  end if;
  update public.llamada_internet
     set estado = 'en_curso', contestada_por = auth.uid(), contestada_en = now()
   where id = l.id;
end;
$$;

create or replace function public.rechazar_llamada(p_llamada_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null or l.de_usuario_id = auth.uid() or not public.esta_en_la_llamada(l.id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado <> 'sonando' then
    return;
  end if;
  update public.llamada_internet
     set estado = 'rechazada', terminada_en = now()
   where id = l.id;
end;
$$;

create or replace function public.colgar_llamada(p_llamada_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null or not public.esta_en_la_llamada(l.id) then
    raise exception 'Esa llamada no es tuya';
  end if;
  if l.estado in ('terminada', 'rechazada', 'perdida') then
    return;
  end if;
  update public.llamada_internet
     set estado = case when l.estado = 'sonando' then 'perdida' else 'terminada' end::estado_intercom,
         terminada_en = now()
   where id = l.id;
end;
$$;

grant execute on function public.llamar_por_internet(destino_intercom, uuid, uuid) to authenticated;
grant execute on function public.contestar_llamada(uuid) to authenticated;
grant execute on function public.rechazar_llamada(uuid) to authenticated;
grant execute on function public.colgar_llamada(uuid) to authenticated;
