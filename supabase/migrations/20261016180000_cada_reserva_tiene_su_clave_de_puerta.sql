-- ============================================================================
-- Cada reserva tiene su clave de puerta
-- ============================================================================
-- La responsable de producto (16/10/2026): «clave de la puerta para cada
-- huésped. En cada reserva, un campo para la clave de la puerta. Solo el
-- anfitrión la pone y solo la ve el huésped, en Alojamiento».
--
-- Hasta hoy había una sola clave por vivienda, en el libro del alojamiento.
-- Esa se queda: es la de siempre. La de la reserva, si la hay, manda para el
-- huésped de esa reserva.
--
-- Se guarda en el Vault, como la otra (regla 9: las credenciales de acceso
-- físico se cifran en reposo). El nombre es determinista --`puerta_visita_<id>`--
-- y se busca por nombre antes de crear, por lo que ya pasó con el wifi: un
-- secreto puede sobrevivir a quien lo referencia. No hace falta columna.
--
-- Quién la ve:
--   · quien configura el alojamiento (anfitrión), para poder corregirla;
--   · el huésped de ESA reserva (`invitado.usuario_id`), y solo dentro de sus
--     fechas, con el reloj del edificio: igual que la clave de la vivienda.
-- La portería y la administración, no.

create or replace function public.guardar_clave_puerta_estancia(
  p_visita_id uuid,
  p_clave     text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, vault
as $$
declare
  v_unidad uuid;
  v_tipo   public.tipo_visita;
  v_id     uuid;
  v_nombre text := 'puerta_visita_' || p_visita_id::text;
begin
  select unidad_id, tipo into v_unidad, v_tipo
  from public.visita where id = p_visita_id and deleted_at is null;

  if v_unidad is null or v_tipo <> 'huesped_temporal' then
    raise exception 'No encontramos esa estancia' using errcode = 'P0002';
  end if;
  if not public.puede_configurar_alojamiento(v_unidad) then
    raise exception 'Solo el anfitrion pone la clave de la puerta' using errcode = '42501';
  end if;

  select id into v_id from vault.secrets where name = v_nombre;

  if coalesce(btrim(p_clave), '') = '' then
    -- Vacía: la reserva vuelve a usar la clave de la vivienda.
    if v_id is not null then
      perform vault.update_secret(v_id, '', v_nombre, 'Clave de la puerta de una reserva');
    end if;
    return;
  end if;

  if v_id is null then
    perform vault.create_secret(btrim(p_clave), v_nombre, 'Clave de la puerta de una reserva');
  else
    perform vault.update_secret(v_id, btrim(p_clave), v_nombre, 'Clave de la puerta de una reserva');
  end if;
end;
$$;

comment on function public.guardar_clave_puerta_estancia(uuid, text) is
  'El anfitrion pone (o borra, con vacio) la clave de la puerta de UNA reserva.';

revoke all on function public.guardar_clave_puerta_estancia(uuid, text) from public;
grant execute on function public.guardar_clave_puerta_estancia(uuid, text) to authenticated;


create or replace function public.clave_puerta_estancia(p_visita_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp, vault
as $$
declare
  v_unidad uuid;
  v_desde  date;
  v_hasta  date;
  v_condo  uuid;
  v_hoy    date;
  v_clave  text;
begin
  select unidad_id, fecha_desde, fecha_hasta, condominio_id
    into v_unidad, v_desde, v_hasta, v_condo
  from public.visita
  where id = p_visita_id and deleted_at is null and tipo = 'huesped_temporal';

  if v_unidad is null then
    return null;
  end if;

  v_hoy := (now() at time zone public.zona_horaria_del_condominio(v_condo))::date;

  if not (
    public.puede_configurar_alojamiento(v_unidad)
    or (
      exists (
        select 1 from public.invitado i
        where i.visita_id = p_visita_id and i.usuario_id = auth.uid()
      )
      and v_hoy >= v_desde
      and (v_hasta is null or v_hoy <= v_hasta)
    )
  ) then
    return null;
  end if;

  select nullif(s.decrypted_secret, '') into v_clave
  from vault.decrypted_secrets s
  where s.name = 'puerta_visita_' || p_visita_id::text;

  return v_clave;
end;
$$;

comment on function public.clave_puerta_estancia(uuid) is
  'La clave de la puerta de una reserva: al anfitrion siempre; al huesped de '
  'esa reserva, solo dentro de sus fechas. A nadie mas. Nula si no hay.';

revoke all on function public.clave_puerta_estancia(uuid) from public;
grant execute on function public.clave_puerta_estancia(uuid) to authenticated;


-- Para «Mi alojamiento»: el huésped no sabe el id de su reserva, sabe la
-- vivienda. Busca la suya de hoy en esa vivienda y pregunta lo mismo.
create or replace function public.clave_puerta_de_mi_estancia(p_unidad_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.clave_puerta_estancia(v.id)
  from public.visita v
  join public.invitado i on i.visita_id = v.id and i.usuario_id = auth.uid()
  where v.unidad_id = p_unidad_id
    and v.tipo = 'huesped_temporal'
    and v.deleted_at is null
    and v.estado <> 'cancelada'
    and (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
        between v.fecha_desde and coalesce(v.fecha_hasta, v.fecha_desde)
  order by v.fecha_desde desc
  limit 1;
$$;

comment on function public.clave_puerta_de_mi_estancia(uuid) is
  'La clave de la puerta de la reserva de hoy de quien pregunta en esa vivienda, o nula.';

revoke all on function public.clave_puerta_de_mi_estancia(uuid) from public;
grant execute on function public.clave_puerta_de_mi_estancia(uuid) to authenticated;
