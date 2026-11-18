-- ============================================================================
-- El índice de votación es un porcentaje (18/11/2026, pedido del cliente)
-- ============================================================================
-- Lo pidió el cliente: «el 100 % se divide entre las propiedades». Cada
-- departamento tiene su porcentaje del edificio, ninguno pasa de 100 y entre
-- todos no pasan de 100. Una encuesta «según el índice» solo se puede crear
-- cuando todos los departamentos tienen su índice y suman exactamente 100 %.
-- Al principio el índice está vacío: nadie lo ha puesto todavía.
--
-- Qué cambia:
--   1. `unidad.indice_votacion` puede quedar vacío y empieza vacío. Los 1 que
--      había los puso el valor por defecto de ayer, no una persona (todas las
--      viviendas de todos los edificios tenían 1 y ninguna encuesta se
--      contaba por índice), así que se vacían.
--   2. Cada índice va de más de 0 a 100.
--   3. La suma del edificio no pasa de 100 (disparador en `unidad`), y
--      mientras una encuesta «según el índice» está abierta, los índices no
--      se mueven: cambiarían un resultado a medio votar.
--   4. `indice_de_votacion_del_edificio`: cuánto suman y cuántos faltan, para
--      que la pantalla lo diga.
--   5. Una encuesta nueva «según el índice» exige el 100 % (disparador en
--      `publicacion`). Las que ya existen no se tocan.
--
-- Solo aditivo: nada se borra. Las versiones instaladas siguen funcionando;
-- muestran el índice vacío como 0 hasta que les llegue la actualización.

-- ----------------------------------------------------------------------------
-- 1 y 2. Vacío al principio, y un porcentaje
-- ----------------------------------------------------------------------------

alter table public.unidad alter column indice_votacion drop not null;
alter table public.unidad alter column indice_votacion drop default;

-- Los 1 del valor por defecto, solo donde nadie tocó nada: en un edificio en
-- el que todos los departamentos siguen en 1.
update public.unidad u
set indice_votacion = null
where u.indice_votacion = 1
  and not exists (
    select 1 from public.unidad o
    where o.condominio_id = u.condominio_id
      and o.indice_votacion is distinct from 1
      and o.indice_votacion is not null
  );

alter table public.unidad
  drop constraint if exists unidad_indice_votacion_positivo;
alter table public.unidad
  drop constraint if exists unidad_indice_votacion_porcentaje;
alter table public.unidad
  add constraint unidad_indice_votacion_porcentaje
  check (indice_votacion is null or (indice_votacion > 0 and indice_votacion <= 100));

comment on column public.unidad.indice_votacion is
  'Índice de votación de la vivienda, en % del edificio (más de 0 y hasta 100). Vacío hasta que la administración lo pone. Entre todas las del edificio no pasan de 100, y una encuesta «según el índice» exige que sumen 100.';

-- ----------------------------------------------------------------------------
-- Un número como lo lee una persona: «12,5», no «12.5000».
-- ----------------------------------------------------------------------------
create or replace function public.porcentaje_para_leer(p numeric)
returns text
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select replace(
    case when position('.' in p::text) > 0
      then rtrim(rtrim(p::text, '0'), '.')
      else p::text end,
    '.', ',');
$fn$;

-- ----------------------------------------------------------------------------
-- 4. Cuánto suma el edificio (para la base y para la pantalla)
-- ----------------------------------------------------------------------------

-- Sin preguntar quién llama: la usan los disparadores. No se expone.
create or replace function public.estado_del_indice_de_votacion(p_condominio_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select jsonb_build_object(
    'suma', coalesce(sum(u.indice_votacion), 0),
    'viviendas', count(*),
    'sin_indice', count(*) filter (where u.indice_votacion is null),
    'completo', count(*) > 0
                and count(*) filter (where u.indice_votacion is null) = 0
                and coalesce(sum(u.indice_votacion), 0) = 100
  )
  from public.unidad u
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null;
$fn$;

revoke all on function public.estado_del_indice_de_votacion(uuid) from public, anon, authenticated;

-- Para la pantalla: la suma no es un secreto, pero es del edificio de quien
-- pregunta.
create or replace function public.indice_de_votacion_del_edificio(p_condominio_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not (public.es_miembro_condominio(p_condominio_id)
          or public.es_administrador_de(p_condominio_id)) then
    return null;
  end if;
  return public.estado_del_indice_de_votacion(p_condominio_id);
end;
$fn$;

comment on function public.indice_de_votacion_del_edificio(uuid) is
  'Cuánto suman los índices de votación del edificio, cuántas viviendas hay, cuántas no tienen índice y si está completo (todas con índice y suman 100 %). Null para quien no es del edificio.';

revoke all on function public.indice_de_votacion_del_edificio(uuid) from public, anon;
grant execute on function public.indice_de_votacion_del_edificio(uuid) to authenticated, service_role;

-- ¿Hay una encuesta abierta que se cuenta según el índice?
create or replace function public.hay_votacion_abierta_por_indice(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.publicacion p
    where p.condominio_id = p_condominio_id
      and p.tipo = 'encuesta'
      and p.deleted_at is null
      and p.quien_vota = 'vivienda'
      and p.como_se_cuenta = 'indice'
      and (p.publicada_hasta is null or p.publicada_hasta > now())
  );
$fn$;

revoke all on function public.hay_votacion_abierta_por_indice(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. La suma del edificio no pasa de 100
-- ----------------------------------------------------------------------------

create or replace function public.cuidar_indice_de_votacion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_antes numeric := 0;
  v_despues numeric := 0;
  v_otros numeric;
begin
  -- Lo que esta vivienda aporta a la suma antes y después del cambio.
  if tg_op = 'UPDATE' and old.deleted_at is null then
    v_antes := coalesce(old.indice_votacion, 0);
  end if;
  if new.deleted_at is null then
    v_despues := coalesce(new.indice_votacion, 0);
  end if;
  if v_antes = v_despues then
    return new;
  end if;

  -- Dos personas cambiando índices del mismo edificio a la vez: de a una.
  perform pg_advisory_xact_lock(hashtext('indice_votacion:' || new.condominio_id::text));

  if public.hay_votacion_abierta_por_indice(new.condominio_id) then
    raise exception 'Hay una encuesta abierta que se cuenta según el índice de votación. Los índices no se pueden cambiar hasta que cierre.'
      using errcode = 'check_violation';
  end if;

  if v_despues > v_antes then
    select coalesce(sum(u.indice_votacion), 0) into v_otros
    from public.unidad u
    where u.condominio_id = new.condominio_id
      and u.deleted_at is null
      and u.id <> new.id;
    if v_otros + v_despues > 100 then
      raise exception 'Con este índice el edificio sumaría % %% y no puede pasar de 100 %%. Los demás departamentos ya suman % %%: a este le queda como máximo % %%.',
        public.porcentaje_para_leer(v_otros + v_despues),
        public.porcentaje_para_leer(v_otros),
        public.porcentaje_para_leer(greatest(100 - v_otros, 0))
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists cuidar_indice_de_votacion on public.unidad;
create trigger cuidar_indice_de_votacion
  before insert or update of indice_votacion, deleted_at on public.unidad
  for each row execute function public.cuidar_indice_de_votacion();

-- ----------------------------------------------------------------------------
-- 5. Una encuesta según el índice, solo con el 100 %
-- ----------------------------------------------------------------------------

create or replace function public.encuesta_por_indice_con_el_cien()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_estado jsonb;
begin
  if new.tipo <> 'encuesta' or new.quien_vota <> 'vivienda' or new.como_se_cuenta <> 'indice' then
    return new;
  end if;
  -- Las que ya se contaban así no se vuelven a mirar.
  if tg_op = 'UPDATE' and old.tipo = 'encuesta' and old.quien_vota = 'vivienda'
     and old.como_se_cuenta = 'indice' then
    return new;
  end if;

  v_estado := public.estado_del_indice_de_votacion(new.condominio_id);
  if not (v_estado->>'completo')::boolean then
    raise exception 'No se puede contar según el índice de votación: los departamentos suman % %%%s, y tienen que sumar 100 %%. Complétalo en Arquitectura › Torres.',
      public.porcentaje_para_leer((v_estado->>'suma')::numeric),
      case when (v_estado->>'sin_indice')::int > 0
        then format(' y %s no tienen índice', v_estado->>'sin_indice') else '' end
      using errcode = 'check_violation';
  end if;
  return new;
end;
$fn$;

drop trigger if exists encuesta_por_indice_con_el_cien on public.publicacion;
create trigger encuesta_por_indice_con_el_cien
  before insert or update of tipo, quien_vota, como_se_cuenta on public.publicacion
  for each row execute function public.encuesta_por_indice_con_el_cien();
