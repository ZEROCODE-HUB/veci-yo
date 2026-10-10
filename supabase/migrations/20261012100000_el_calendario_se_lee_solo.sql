-- El calendario del alojamiento se lee solo, cada cierto tiempo.
--
-- Aditiva: una tabla nueva, dos columnas nuevas y funciones. No se borra nada.
--
-- Hasta aqui el calendario de Airbnb solo se leia cuando el anfitrion pulsaba
-- «Sincronizar ahora»: una reserva hecha de madrugada no existia para la
-- porteria hasta que alguien se acordaba de pulsar. El cliente lo pidio el
-- 09/10/2026: que la reserva se cree sola, y que cada cuanto se lee se pueda
-- cambiar **desde la base**, sin desplegar nada.

-- ============================================================================
-- 1. Lo que la plataforma tiene configurado
-- ============================================================================

create table if not exists public.configuracion_plataforma (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique,
  valor       text not null,
  descripcion text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.configuracion_plataforma is
  'Los ajustes de Veciyo que se cambian sin desplegar: cada cuanto se lee un '
  'calendario, cuantos por pasada. No es de ningun edificio: es de la plataforma.';

alter table public.configuracion_plataforma enable row level security;

/*
  Solo lectura, y solo para quien opera la plataforma. No hay politica de
  escritura a proposito: se cambia con la clave de servicio o desde el panel
  de SQL. Un ajuste que decide cuantas veces se llama a un portal ajeno no lo
  mueve una sesion de la aplicacion.
*/
drop policy if exists configuracion_plataforma_lectura on public.configuracion_plataforma;
create policy configuracion_plataforma_lectura on public.configuracion_plataforma
  for select using (public.es_staff_plataforma());

drop trigger if exists configuracion_plataforma_tocar_updated_at on public.configuracion_plataforma;
create trigger configuracion_plataforma_tocar_updated_at
  before update on public.configuracion_plataforma
  for each row execute function public.tocar_updated_at();

insert into public.configuracion_plataforma (clave, valor, descripcion) values
  ('calendario_intervalo_minutos', '60',
   'Cada cuantos minutos se vuelve a leer el calendario de un alojamiento.'),
  ('calendario_max_por_pasada', '50',
   'Cuantos calendarios se piden como mucho en cada pasada del cron.')
on conflict (clave) do nothing;

create or replace function public.valor_configuracion(p_clave text)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select valor from public.configuracion_plataforma where clave = p_clave;
$$;

comment on function public.valor_configuracion(text) is
  'Interna: lee un ajuste de la plataforma. No pregunta quien llama, asi que '
  'no se concede a nadie.';

revoke execute on function public.valor_configuracion(text) from public, anon, authenticated;
grant execute on function public.valor_configuracion(text) to service_role;

-- ============================================================================
-- 2. Cuando se pidio por ultima vez, y lo que el calendario trae del telefono
-- ============================================================================

alter table public.suscripcion_renta_corta
  add column if not exists ical_pedido_en timestamptz;

comment on column public.suscripcion_renta_corta.ical_pedido_en is
  'Cuando pidio el cron la ultima lectura. Aparte de `ical_sincronizado_en` '
  'porque un portal que no responde no llega a escribir esa, y sin esto se le '
  'volveria a pedir cada cinco minutos.';

alter table public.visita
  add column if not exists telefono_ultimos4 text;

alter table public.visita
  drop constraint if exists visita_ultimos4_son_cuatro_digitos;
alter table public.visita
  add constraint visita_ultimos4_son_cuatro_digitos
  check (telefono_ultimos4 is null or telefono_ultimos4 ~ '^[0-9]{4}$');

comment on column public.visita.telefono_ultimos4 is
  'Los ultimos cuatro digitos del telefono con el que se reservo, tal como '
  'los trae el calendario de Airbnb. Es lo unico del huesped que el '
  'calendario da, y sirve para comprobar que quien abre el enlace es el.';

-- ============================================================================
-- 3. A quien toca leer ahora
-- ============================================================================

/*
  Separado de «pedirlo», igual que los recordatorios: asi se puede mirar --y
  probar-- a quien se iba a leer sin llamar a ningun portal.
*/
create or replace function public.calendarios_por_sincronizar()
returns table (unidad_id uuid, ultima_vez timestamptz)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with ajustes as (
    select
      greatest(coalesce(public.valor_configuracion('calendario_intervalo_minutos')::int, 60), 5) as minutos,
      greatest(coalesce(public.valor_configuracion('calendario_max_por_pasada')::int, 50), 1) as tope
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
      and nullif(btrim(coalesce(s.ical_url, '')), '') is not null
  )
  select c.unidad_id, c.ultima_vez
  from candidatas c, ajustes a
  where c.ultima_vez is null
     or c.ultima_vez < now() - make_interval(mins => a.minutos)
  -- Las que llevan mas tiempo sin leerse, primero; las nunca leidas, antes.
  order by c.ultima_vez asc nulls first
  limit (select tope from ajustes);
$$;

comment on function public.calendarios_por_sincronizar() is
  'Interna: las viviendas con renta corta activa y calendario conectado cuyo '
  'calendario toca volver a leer, segun el intervalo configurado.';

revoke execute on function public.calendarios_por_sincronizar() from public, anon, authenticated;
grant execute on function public.calendarios_por_sincronizar() to service_role;

-- ============================================================================
-- 4. Pedirlo
-- ============================================================================

create or replace function public.sincronizar_calendarios_vencidos()
returns int
language plpgsql
security definer
set search_path = public, pg_temp, extensions
as $fn$
declare
  v_url    text;
  v_clave  text;
  v_fila   record;
  v_pedidos int := 0;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    raise exception 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault';
  end if;

  for v_fila in select * from public.calendarios_por_sincronizar() loop
    /*
      Se apunta **antes** de pedir. `pg_net` es asincrono: si se esperase la
      respuesta, un portal lento bloquearia la pasada entera. Y si la lectura
      falla, la vivienda no vuelve a entrar hasta el siguiente intervalo.
    */
    update public.suscripcion_renta_corta
    set ical_pedido_en = now()
    where unidad_id = v_fila.unidad_id;

    perform net.http_post(
      url     := v_url || '/functions/v1/sincronizar-calendario',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_clave
      ),
      body    := jsonb_build_object('unidadId', v_fila.unidad_id, 'desdeElCron', true)
    );

    v_pedidos := v_pedidos + 1;
  end loop;

  return v_pedidos;
end;
$fn$;

comment on function public.sincronizar_calendarios_vencidos() is
  'Pide la lectura de los calendarios que toca. La llama pg_cron cada cinco '
  'minutos; el intervalo real por vivienda lo decide `configuracion_plataforma`.';

revoke all on function public.sincronizar_calendarios_vencidos() from public, anon, authenticated;
grant execute on function public.sincronizar_calendarios_vencidos() to service_role;

/*
  Cada cinco minutos, y no «cada hora»: el cron solo pregunta si a alguien le
  toca. Asi el intervalo se cambia con un `update` y no reprogramando el cron.
*/
do $$
begin
  perform cron.unschedule('sincronizar-calendarios');
exception when others then
  null;
end $$;

select cron.schedule(
  'sincronizar-calendarios',
  '*/5 * * * *',
  $cron$ select public.sincronizar_calendarios_vencidos(); $cron$
);

notify pgrst, 'reload schema';
