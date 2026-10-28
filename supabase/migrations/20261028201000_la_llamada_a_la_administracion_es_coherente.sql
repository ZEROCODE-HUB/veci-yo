-- La llamada a la administración no lleva vivienda de destino, igual que la
-- de portería (28/10/2026). La restricción del 14/10 solo conocía esos dos
-- destinos y rechazaba el nuevo. Se cambia por la misma con el tercero.

alter table public.llamada_internet
  drop constraint if exists llamada_internet_destino_coherente;

alter table public.llamada_internet
  add constraint llamada_internet_destino_coherente check (
    (destino = 'vivienda' and a_unidad_id is not null)
    or (destino in ('porteria', 'administracion') and a_unidad_id is null)
  );

-- Y el guardia sin permiso de llamadas sigue leyendo el motivo de siempre.
create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_origen     public.origen_intercom;
  v_id         uuid;
begin
  if p_desde_unidad_id is not null then
    -- Desde una vivienda: quien vive ahí o el huésped que está dentro hoy.
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

  if not exists (
    select 1 from (
      select mc.usuario_id from public.membresia_condominio mc
      where mc.condominio_id = v_condominio and mc.activo and mc.usuario_id is not null
      union
      select m.usuario_id from public.membresia_unidad m
      where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end)
  ) then
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen)
  returning id into v_id;
  return v_id;
end;
$function$;
