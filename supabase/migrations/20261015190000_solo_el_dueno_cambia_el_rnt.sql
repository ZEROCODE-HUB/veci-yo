-- Solo el dueño carga o cambia el RNT (15/10/2026).
--
-- El KT lo dice dos veces (0.6 y 4.1): la documentacion del RNT «solo la puede
-- completar el dueño del departamento, esta todo a su nombre»; el inquilino
-- lider ni siquiera ve el boton. En la base lo podia cambiar cualquiera que
-- configure el alojamiento --propietario, inquilino lider, coadministrador de
-- la vivienda y la administracion--, y la pantalla no ocultaba el campo.
--
-- El cliente lo confirmo (decision del 15/10/2026). Ahora la base lo exige en
-- las dos tablas donde vive el dato; la pantalla lo enseña sin poder editarlo
-- a quien no es el dueño.

create or replace function public.es_propietario_de(p_unidad_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.rol = 'propietario'
      and m.activo
  );
$function$;

comment on function public.es_propietario_de(uuid) is
  'Si quien llama es el propietario (dueño) de la vivienda.';

create or replace function public.solo_el_dueno_cambia_el_rnt()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_nuevo   text;
  v_viejo   text;
  v_vence_n date;
  v_vence_v date;
begin
  -- Sin sesion: migraciones, clave de servicio, consola.
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'suscripcion_renta_corta' then
    v_nuevo := nullif(btrim(coalesce(new.rnt, '')), '');
    v_vence_n := new.rnt_vence_en;
    if tg_op = 'UPDATE' then
      v_viejo := nullif(btrim(coalesce(old.rnt, '')), '');
      v_vence_v := old.rnt_vence_en;
    end if;
  else
    v_nuevo := nullif(btrim(coalesce(new.numero, '')), '');
    v_vence_n := new.vence_en;
    if tg_op = 'UPDATE' then
      v_viejo := nullif(btrim(coalesce(old.numero, '')), '');
      v_vence_v := old.vence_en;
    end if;
  end if;

  if v_nuevo is not distinct from v_viejo and v_vence_n is not distinct from v_vence_v then
    return new;
  end if;

  if not public.es_propietario_de(new.unidad_id) then
    raise exception 'Solo el propietario de la vivienda puede cargar o cambiar el RNT';
  end if;

  return new;
end;
$function$;

drop trigger if exists suscripcion_rnt_solo_el_dueno on public.suscripcion_renta_corta;
create trigger suscripcion_rnt_solo_el_dueno
  before insert or update on public.suscripcion_renta_corta
  for each row execute function public.solo_el_dueno_cambia_el_rnt();

drop trigger if exists registro_turismo_solo_el_dueno on public.registro_turismo;
create trigger registro_turismo_solo_el_dueno
  before insert or update on public.registro_turismo
  for each row execute function public.solo_el_dueno_cambia_el_rnt();
