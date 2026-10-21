-- Cada plataforma, su calendario (21/10/2026)
--
-- Una vivienda tenía un solo enlace de calendario, `suscripcion_renta_corta.ical_url`,
-- pensado para Airbnb. Quien publica también en Booking no tenía dónde poner el
-- suyo. Ahora cada vivienda tiene un calendario por plataforma, con su última
-- lectura y su error, y la función que sincroniza los lee todos.
--
-- Solo aditiva: `ical_url` se queda (se copia aquí y deja de escribirse desde la
-- app); las funciones viejas se quedan para quien tenga abierta la app anterior.

create table if not exists public.calendario_vivienda (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad (id) on delete cascade,
  plataforma public.plataforma_reserva not null,
  url text not null,
  sincronizado_en timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendario_vivienda_una_por_plataforma unique (unidad_id, plataforma),
  -- «directo» es una reserva hecha a mano: no tiene calendario que leer.
  constraint calendario_vivienda_plataforma_con_calendario check (plataforma <> 'directo'),
  constraint calendario_vivienda_url_web check (url ~* '^https?://\S+\.\S+')
);

comment on table public.calendario_vivienda is
  'El calendario (iCal) de cada plataforma donde se publica una vivienda de renta corta: Airbnb, Booking u otra. La función sincronizar-calendario los lee todos y crea las estancias.';
comment on column public.calendario_vivienda.id is 'Identificador del calendario.';
comment on column public.calendario_vivienda.unidad_id is 'La vivienda de renta corta a la que pertenece.';
comment on column public.calendario_vivienda.plataforma is 'De qué plataforma es: airbnb, booking u otra. Una por vivienda y plataforma.';
comment on column public.calendario_vivienda.url is 'El enlace de exportación iCal que da la plataforma. Es privado: quien lo tiene ve las fechas reservadas.';
comment on column public.calendario_vivienda.sincronizado_en is 'Cuándo se leyó bien por última vez.';
comment on column public.calendario_vivienda.error is 'Por qué falló la última lectura, para enseñárselo al anfitrión. Vacío si fue bien.';
comment on column public.calendario_vivienda.created_at is 'Cuándo se conectó.';
comment on column public.calendario_vivienda.updated_at is 'Última modificación.';

drop trigger if exists calendario_vivienda_tocar_updated_at on public.calendario_vivienda;
create trigger calendario_vivienda_tocar_updated_at
  before update on public.calendario_vivienda
  for each row execute function public.tocar_updated_at();

alter table public.calendario_vivienda enable row level security;

drop policy if exists calendario_vivienda_lectura on public.calendario_vivienda;
create policy calendario_vivienda_lectura on public.calendario_vivienda
  for select using (public.puede_configurar_alojamiento(unidad_id));

drop policy if exists calendario_vivienda_alta on public.calendario_vivienda;
create policy calendario_vivienda_alta on public.calendario_vivienda
  for insert with check (public.puede_configurar_alojamiento(unidad_id));

drop policy if exists calendario_vivienda_cambio on public.calendario_vivienda;
create policy calendario_vivienda_cambio on public.calendario_vivienda
  for update using (public.puede_configurar_alojamiento(unidad_id))
  with check (public.puede_configurar_alojamiento(unidad_id));

drop policy if exists calendario_vivienda_baja on public.calendario_vivienda;
create policy calendario_vivienda_baja on public.calendario_vivienda
  for delete using (public.puede_configurar_alojamiento(unidad_id));

-- El enlace que ya había, con la plataforma que dice su dirección.
insert into public.calendario_vivienda (unidad_id, plataforma, url, sincronizado_en, error)
select s.unidad_id,
       coalesce(public.plataforma_por_direccion(s.ical_url), 'otra'),
       btrim(s.ical_url),
       s.ical_sincronizado_en,
       s.ical_error
from public.suscripcion_renta_corta s
where nullif(btrim(coalesce(s.ical_url, '')), '') is not null
  and btrim(s.ical_url) ~* '^https?://\S+\.\S+'
on conflict (unidad_id, plataforma) do nothing;

-- Los calendarios de una vivienda, para quien la configura.
create or replace function public.calendarios_de_unidad(p_unidad_id uuid)
returns table (plataforma public.plataforma_reserva, url text,
               sincronizado_en timestamptz, error text, condominio_id uuid)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  return query
  select c.plataforma, c.url, c.sincronizado_en, c.error, u.condominio_id
  from public.calendario_vivienda c
  join public.unidad u on u.id = c.unidad_id
  where c.unidad_id = p_unidad_id
  order by c.plataforma;
end;
$$;

comment on function public.calendarios_de_unidad(uuid) is
  'Los calendarios (uno por plataforma) de una vivienda, con su última lectura y su error. Solo para quien puede configurar el alojamiento.';

-- Las viviendas que toca leer: ahora miran la tabla nueva.
create or replace function public.calendarios_por_sincronizar()
returns table (unidad_id uuid, ultima_vez timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ajustes as (
    select
      public.parametro_entero('calendario_intervalo_minutos') as minutos,
      public.parametro_entero('calendario_max_por_pasada') as tope
  ),
  candidatas as (
    select
      s.unidad_id,
      nullif(greatest(
        coalesce(s.ical_sincronizado_en, '-infinity'::timestamptz),
        coalesce(s.ical_pedido_en, '-infinity'::timestamptz)
      ), '-infinity'::timestamptz) as ultima_vez
    from public.suscripcion_renta_corta s
    where s.estado = 'activa'
      and s.cancelada_en is null
      and exists (select 1 from public.calendario_vivienda c where c.unidad_id = s.unidad_id)
  )
  select c.unidad_id, c.ultima_vez
  from candidatas c, ajustes a
  where c.ultima_vez is null
     or c.ultima_vez < now() - make_interval(mins => a.minutos)
  order by c.ultima_vez asc nulls first
  limit (select tope from ajustes);
$$;

comment on column public.suscripcion_renta_corta.ical_url is
  'Desde el 21/10/2026 ya no se escribe: los calendarios viven en calendario_vivienda, uno por plataforma. Se conserva por los datos de antes.';
