-- Juntar dos cambios del mismo día en las funciones de la llamada (17/11/2026).
--
-- `20261117186000_trabajador_permanente_de_la_vivienda` (el trabajador de la
-- vivienda con app también contesta) y `20261117187000_llamar_a_una_persona_de_la_vivienda`
-- (elegir a quién de la vivienda, o «Todos») reescribieron las mismas
-- funciones y se aplicaron en orden inverso al de sus nombres: la segunda en
-- aplicarse borró de `quienes_reciben_la_llamada` el filtro por la persona
-- elegida, y `llamar_a_quien` no conocía al trabajador. Aquí van las dos cosas
-- juntas, partiendo del cuerpo que había en la base:
--
--   · `quienes_reciben_la_llamada`: con el trabajador y con la persona elegida;
--   · `llamar_a_quien`: con el trabajador;
--   · `llamar_por_internet` (la app de hoy): vuelve a ser `llamar_a_quien` sin
--     persona, para que las dos no se separen otra vez.

create or replace function public.quienes_reciben_la_llamada(p_llamada_id uuid)
returns table(usuario_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select distinct gente.usuario_id
  from public.llamada_internet l
  cross join lateral (
    select mc.usuario_id from public.membresia_condominio mc
    where mc.condominio_id = l.condominio_id and mc.activo and mc.usuario_id is not null
    union
    select m.usuario_id from public.membresia_unidad m
    where l.destino = 'vivienda' and m.unidad_id = l.a_unidad_id and m.activo
    union
    select t.usuario_id from public.trabajador_de_la_vivienda t
    where l.destino = 'vivienda' and t.unidad_id = l.a_unidad_id
      and t.usuario_id is not null and t.deleted_at is null
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    -- Si se eligió a una persona, solo a ella (17/11/2026).
    and (l.a_usuario_id is null or gente.usuario_id = l.a_usuario_id)
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id,
                                   l.a_unidad_id, l.de_usuario_id);
$$;

create or replace function public.llamar_a_quien(
  p_destino public.destino_intercom,
  p_a_usuario_id uuid default null,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_origen     public.origen_intercom;
  v_id         uuid;
begin
  if p_desde_unidad_id is not null then
    -- Desde una vivienda: quien vive ahí o el huésped que está dentro hoy.
    -- El trabajador no: él contesta, no llama (17/11/2026).
    if not (public.es_miembro_unidad(p_desde_unidad_id)
            or public.es_huesped_alojado(p_desde_unidad_id)) then
      raise exception 'Solo se llama desde una vivienda tuya';
    end if;
    if p_destino = 'vivienda' then
      raise exception 'Desde una vivienda se llama a la portería o a la administración';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
    v_origen := 'vivienda';
  else
    v_condominio := coalesce(p_condominio_id, public.condominio_de_unidad(p_a_unidad_id));
    if v_condominio is null then
      raise exception 'Falta a quién llamas';
    end if;
    if p_destino <> 'administracion' and public.es_admin_condominio(v_condominio) then
      v_origen := 'administracion';
    elsif p_destino <> 'porteria' and public.porteria_puede_llamar(v_condominio) then
      v_origen := 'porteria';
    elsif public.es_personal_condominio(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    else
      raise exception 'No puedes llamar a ese destino desde aquí';
    end if;
  end if;

  if p_destino = 'vivienda' then
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    if public.condominio_de_unidad(p_a_unidad_id) is distinct from v_condominio then
      raise exception 'Esa vivienda no es de tu edificio';
    end if;
  end if;

  -- Una persona concreta, solo dentro de una vivienda.
  if p_a_usuario_id is not null and p_destino <> 'vivienda' then
    raise exception 'Solo se elige a una persona al llamar a una vivienda';
  end if;

  if not exists (
    select 1 from (
      select mc.usuario_id from public.membresia_condominio mc
      where mc.condominio_id = v_condominio and mc.activo and mc.usuario_id is not null
      union
      select m.usuario_id from public.membresia_unidad m
      where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
      union
      select t.usuario_id from public.trabajador_de_la_vivienda t
      where p_destino = 'vivienda' and t.unidad_id = p_a_unidad_id
        and t.usuario_id is not null and t.deleted_at is null
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and (p_a_usuario_id is null or gente.usuario_id = p_a_usuario_id)
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end,
                                     auth.uid())
  ) then
    if p_a_usuario_id is not null then
      raise exception 'Esa persona no recibe llamadas por la app: elige «Todos» o llama por teléfono'
        using errcode = 'P0001';
    end if;
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen, a_usuario_id)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen, p_a_usuario_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.llamar_a_quien(p_destino, null::uuid, p_a_unidad_id, p_desde_unidad_id, p_condominio_id);
$$;
