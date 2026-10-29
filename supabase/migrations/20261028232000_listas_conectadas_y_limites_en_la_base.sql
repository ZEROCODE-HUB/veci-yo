-- ============================================================================
-- Qué listas lee de verdad la app, y los límites nuevos también en la base
-- (28/10/2026)
-- ============================================================================
--
-- 1. `catalogo_info.conectada`: el panel solo enseña una lista si la app, la
--    web o una función de la base **la lee**. Una lista que se pudiera cambiar
--    en el panel sin que cambie nada sería otra casilla decorativa, que es el
--    defecto más repetido de este proyecto. Se encienden a medida que cada
--    pantalla deja su lista escrita a mano.
-- 2. «Directo» se llama «Otro» desde el 23/10/2026 (QA); la base seguía
--    diciendo «Directo».
-- 3. Del tipo de documento solo se cambian desde el panel las siglas de la
--    TRA: el código de Tus Datos todavía lo decide `tusdatos.ts`.
-- 4. La duración del contrato y el largo del número de emergencias se
--    comprueban en la base con los mismos ajustes que usa la pantalla: un
--    límite que solo vive en la interfaz no es un límite.
--
-- Aditiva.
-- ============================================================================

alter table public.catalogo_info
  add column if not exists conectada boolean not null default false;
comment on column public.catalogo_info.conectada is
  'Si la app, la web o la base leen de verdad esta lista. El panel solo enseña las conectadas: cambiar una que nadie lee no cambiaría nada.';

update public.catalogo_info set conectada = true
 where catalogo in (
   'tipos_de_documento',              -- siglas de la TRA (reportar-tra)
   'motivos_de_viaje',                -- nombres de la TRA (reportar-tra)
   'antecedentes_fuentes_obligatorias', -- verificar-antecedentes
   'palabras_de_bloqueo_ical',        -- sincronizar-calendario
   'canales_iniciales',               -- sembrar_canales_del_condominio
   'cargos_equipo_admin',             -- ContactoForm
   'motivos_eliminar_cuenta',         -- EliminarCuenta
   'plataformas_de_reserva'           -- PlataformaDeLaReserva
 );

update public.catalogo_opcion set etiqueta = 'Otro', updated_at = now()
 where catalogo = 'plataformas_de_reserva' and codigo = 'directo' and etiqueta = 'Directo';

update public.catalogo_info
   set campos_extra = '[{"clave": "siglas_tra", "etiqueta": "Siglas en la TRA (vacío = se manda como dice «tra_documento_sin_equivalente»)", "tipo": "texto"}]'::jsonb,
       descripcion = 'Cómo se nombra cada documento ante el ministerio en la TRA. El largo y a quién se pide se cambian en Países.'
 where catalogo = 'tipos_de_documento';

create or replace function public.panel_listas()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve las listas' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'catalogo', i.catalogo,
             'titulo', i.titulo,
             'descripcion', i.descripcion,
             'admiteNuevas', i.admite_nuevas,
             'porPais', i.por_pais,
             'riesgo', i.riesgo,
             'camposExtra', i.campos_extra,
             'opciones', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', o.id, 'codigo', o.codigo, 'etiqueta', o.etiqueta, 'orden', o.orden,
                        'activo', o.activo, 'pais', btrim(o.pais), 'extra', o.extra)
                      order by o.pais nulls first, o.orden, o.etiqueta)
               from public.catalogo_opcion o where o.catalogo = i.catalogo), '[]'::jsonb))
           order by i.orden, i.titulo)
    from public.catalogo_info i
    where i.conectada), '[]'::jsonb);
end;
$$;
comment on function public.panel_listas() is
  'Las listas que la app lee de verdad (`conectada`), con todas sus opciones, también las apagadas. Equipo de la plataforma.';

-- Una lista que el panel no enseña tampoco se cambia por la puerta de atrás.
create or replace function public.lista_esta_conectada(p_catalogo public.nombre_catalogo)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce((select conectada from public.catalogo_info where catalogo = p_catalogo), false);
$$;
revoke all on function public.lista_esta_conectada(public.nombre_catalogo) from public, anon, authenticated;

create or replace function public.no_tocar_listas_desconectadas()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Solo vale para el panel (una sesión); la clave de servicio y las
  -- migraciones siembran lo que haga falta.
  if auth.uid() is not null and not public.lista_esta_conectada(new.catalogo) then
    raise exception 'Esta lista todavía no la lee la app: cambiarla no cambiaría nada';
  end if;
  return new;
end;
$$;
drop trigger if exists catalogo_opcion_solo_conectadas on public.catalogo_opcion;
create trigger catalogo_opcion_solo_conectadas before insert or update on public.catalogo_opcion
  for each row execute function public.no_tocar_listas_desconectadas();

-- ----------------------------------------------------------------------------
-- La duración del contrato
-- ----------------------------------------------------------------------------

create or replace function public.contrato_con_duracion_permitida()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_min int := public.parametro_entero('contrato_meses_minimo');
  v_max int := public.parametro_entero('contrato_meses_maximo');
begin
  if new.duracion_meses is not null and new.duracion_meses not between v_min and v_max then
    raise exception 'La duración del contrato va de % a % meses, o vacía si no tiene fin', v_min, v_max;
  end if;
  return new;
end;
$$;
comment on function public.contrato_con_duracion_permitida() is
  'La duración de un contrato entre `contrato_meses_minimo` y `contrato_meses_maximo`, los mismos que usa la pantalla.';
drop trigger if exists contrato_duracion_permitida on public.contrato_arrendamiento;
create trigger contrato_duracion_permitida before insert or update of duracion_meses on public.contrato_arrendamiento
  for each row execute function public.contrato_con_duracion_permitida();

-- ----------------------------------------------------------------------------
-- El número de emergencias del edificio
-- ----------------------------------------------------------------------------

create or replace function public.policia_con_largo_permitido()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_min int := public.parametro_entero('emergencias_largo_minimo');
  v_max int := public.parametro_entero('emergencias_largo_maximo');
begin
  if nullif(btrim(coalesce(new.telefono_policia, '')), '') is not null
     and (new.telefono_policia !~ '^[0-9]+$' or length(new.telefono_policia) not between v_min and v_max) then
    raise exception 'El número de la policía tiene que tener entre % y % cifras', v_min, v_max;
  end if;
  return new;
end;
$$;
comment on function public.policia_con_largo_permitido() is
  'El número de emergencias de un edificio con el largo de `emergencias_largo_*`, el mismo que usa la pantalla.';
drop trigger if exists condominio_policia_con_largo on public.condominio;
create trigger condominio_policia_con_largo before insert or update of telefono_policia on public.condominio
  for each row execute function public.policia_con_largo_permitido();
