-- ----------------------------------------------------------------------------
-- Votaciones: índice por vivienda, quién vota y cuándo se aprueba (17/11/2026)
-- ----------------------------------------------------------------------------
-- Lo aprobó el cliente el 17/11/2026:
--
--   · Cada vivienda tiene un ÍNDICE DE VOTACIÓN (coeficiente). Por defecto 1:
--     así toda vivienda que ya existe vale lo mismo que hoy.
--   · Al crear una encuesta se elige quién vota (una vez por vivienda, o cada
--     residente), cómo se cuenta (un voto igual, o según el índice) y cuándo
--     se aprueba (mayoría simple de los votos emitidos, o un umbral mínimo en
--     % del total posible).
--   · El resultado lo calcula la BASE, no el celular: así todos ven el mismo
--     número y nadie puede «arreglarlo» en su teléfono.
--
-- Aditiva. Columnas nuevas con default, funciones nuevas, y dos cambios que
-- hay que explicar:
--
--   1. `validar_voto_unico` aprende el modo «cada residente». Su regla para
--      las encuestas de siempre (por vivienda) no cambia.
--   2. Se retira el índice único `voto_unico_por_vivienda` (publicación,
--      vivienda, opción). Con «cada residente» dos personas de la misma
--      vivienda votan, y pueden votar lo mismo: ese índice lo impedía. Lo que
--      él garantizaba lo garantiza ahora el disparador, con un candado por
--      vivienda (o por persona) para que dos votos a la vez no se cuelen.
--      No se borra ni una fila.
--
-- La columna vieja `publicacion.umbral` («participación esperada») se queda:
-- las versiones de la app ya instaladas la siguen leyendo y escribiendo.

-- ----------------------------------------------------------------------------
-- 1. El índice de votación de cada vivienda
-- ----------------------------------------------------------------------------

alter table public.unidad
  add column if not exists indice_votacion numeric(12,4) not null default 1;

alter table public.unidad
  drop constraint if exists unidad_indice_votacion_positivo;
alter table public.unidad
  add constraint unidad_indice_votacion_positivo check (indice_votacion > 0);

comment on column public.unidad.indice_votacion is
  'Índice de votación (coeficiente) de la vivienda. Pesa su voto en las encuestas que se cuentan «según el índice». 1 por defecto: todas iguales.';

-- ----------------------------------------------------------------------------
-- 2. Cómo vota y cuándo se aprueba cada encuesta
-- ----------------------------------------------------------------------------
-- Defaults fijos y no leídos de un parámetro: son los de la regla de hoy, y
-- es lo que tiene que pasar cuando una versión vieja de la app crea una
-- encuesta sin saber que existen. Los valores que la pantalla PROPONE al
-- crear sí son parámetros (más abajo).

-- Enums y no texto libre (regla 4 de AGENTS.md).
do $$ begin
  create type public.quien_vota_encuesta as enum ('vivienda', 'residente');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.como_se_cuenta_voto as enum ('igual', 'indice');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.regla_aprobacion_encuesta as enum ('mayoria', 'umbral');
exception when duplicate_object then null; end $$;

alter table public.publicacion
  add column if not exists quien_vota public.quien_vota_encuesta not null default 'vivienda',
  add column if not exists como_se_cuenta public.como_se_cuenta_voto not null default 'igual',
  add column if not exists regla_aprobacion public.regla_aprobacion_encuesta not null default 'mayoria',
  add column if not exists umbral_aprobacion numeric(5,2);

-- Un umbral sin porcentaje no se puede medir, y un porcentaje fuera de 1–100
-- no es un porcentaje.
alter table public.publicacion drop constraint if exists publicacion_umbral_aprobacion_valido;
alter table public.publicacion add constraint publicacion_umbral_aprobacion_valido
  check (
    (umbral_aprobacion is null or (umbral_aprobacion > 0 and umbral_aprobacion <= 100))
    and (regla_aprobacion <> 'umbral' or umbral_aprobacion is not null)
  );

comment on column public.publicacion.quien_vota is
  'vivienda = un voto por vivienda (quien tiene dos vota dos veces); residente = cada persona con derecho vale 1.';
comment on column public.publicacion.como_se_cuenta is
  'Solo si vota la vivienda: igual = cada vivienda vale 1; indice = cada vivienda vale su unidad.indice_votacion.';
comment on column public.publicacion.regla_aprobacion is
  'mayoria = gana la opción con más peso entre los votos emitidos; umbral = se aprueba al llegar a umbral_aprobacion % del total posible.';
comment on column public.publicacion.umbral_aprobacion is
  'Porcentaje del total posible (viviendas, índice total o residentes con derecho) que hace falta para aprobar, cuando regla_aprobacion = umbral.';

-- ----------------------------------------------------------------------------
-- 3. Los valores que la pantalla propone al crear
-- ----------------------------------------------------------------------------

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('encuesta_quien_vota_por_defecto', 'vivienda', 'vivienda', 'texto', null, null, null, 'edificio', 'avisos', 'bajo', true,
   array['vivienda', 'residente'],
   'Quién vota en una encuesta nueva, si la administración no elige otra cosa: «vivienda» (un voto por vivienda) o «residente» (cada persona con derecho vale 1).'),
  ('encuesta_como_se_cuenta_por_defecto', 'igual', 'igual', 'texto', null, null, null, 'edificio', 'avisos', 'bajo', true,
   array['igual', 'indice'],
   'Cómo se cuenta el voto de cada vivienda en una encuesta nueva: «igual» (todas valen 1) o «indice» (según su índice de votación).'),
  ('encuesta_regla_por_defecto', 'mayoria', 'mayoria', 'texto', null, null, null, 'edificio', 'avisos', 'bajo', true,
   array['mayoria', 'umbral'],
   'Cuándo se aprueba una encuesta nueva: «mayoria» (mayoría simple de los votos emitidos) o «umbral» (un % mínimo del total).'),
  ('encuesta_umbral_por_defecto', '70', '70', 'decimal', '%', 1, 100, 'edificio', 'avisos', 'bajo', true, null,
   'Porcentaje del total que la pantalla propone como umbral mínimo para aprobar una encuesta.')
on conflict (clave) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Un voto por vivienda, o uno por persona
-- ----------------------------------------------------------------------------

drop index if exists public.voto_unico_por_vivienda;

create or replace function public.validar_voto_unico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_multiple boolean;
  v_quien text;
  v_existentes integer;
begin
  select voto_multiple, quien_vota into v_multiple, v_quien
  from public.publicacion where id = new.publicacion_id;

  v_multiple := coalesce(v_multiple, false);

  if coalesce(v_quien, 'vivienda') = 'residente' and new.unidad_id is not null then
    /*
      Cada residente vale 1 (17/11/2026). Quien tiene dos viviendas vota UNA
      vez, por la que sea: la persona es lo que se cuenta. El candado evita
      que dos toques seguidos metan dos votos a la vez.
    */
    perform pg_advisory_xact_lock(hashtextextended('voto:' || new.publicacion_id || ':p:' || new.usuario_id, 0));
    select count(*) into v_existentes
    from public.voto v
    where v.publicacion_id = new.publicacion_id
      and v.usuario_id = new.usuario_id
      and (not v_multiple or v.opcion_id = new.opcion_id)
      and v.id <> coalesce(new.id, gen_random_uuid());
    if v_existentes > 0 then
      raise exception '%', case when v_multiple
        then 'Ya elegiste esta opción'
        else 'Ya votaste en esta encuesta' end;
    end if;
  elsif new.unidad_id is not null then
    -- Por vivienda. Quien tiene dos vota dos veces, una por cada una.
    perform pg_advisory_xact_lock(hashtextextended('voto:' || new.publicacion_id || ':u:' || new.unidad_id, 0));
    select count(*) into v_existentes
    from public.voto v
    where v.publicacion_id = new.publicacion_id
      and v.unidad_id = new.unidad_id
      and (not v_multiple or v.opcion_id = new.opcion_id)
      and v.id <> coalesce(new.id, gen_random_uuid());
    if v_existentes > 0 then
      raise exception '%', case when v_multiple
        then 'Esta vivienda ya eligió esta opción'
        else 'Esta vivienda ya voto en esta encuesta' end;
    end if;
  else
    -- Sin vivienda --la portería, la administración-- una por persona, que
    -- es lo único que se puede contar. (En las de varias opciones lo sujeta
    -- además el índice `voto_unico_sin_vivienda`.)
    if not v_multiple then
      select count(*) into v_existentes
      from public.voto v
      where v.publicacion_id = new.publicacion_id
        and v.usuario_id = new.usuario_id
        and v.unidad_id is null
        and v.id <> coalesce(new.id, gen_random_uuid());
      if v_existentes > 0 then
        raise exception 'Esta encuesta admite un solo voto por persona';
      end if;
    end if;
  end if;

  return new;
end;
$fn$;

comment on function public.validar_voto_unico() is
  'Un voto por vivienda (quien tiene dos vota dos veces, 05/10/2026) o, si la encuesta es de «cada residente», uno por persona (17/11/2026). En las de varias opciones, cada opción una sola vez. Candado por vivienda/persona para que dos votos simultáneos no se cuelen.';

-- ----------------------------------------------------------------------------
-- 5. Piezas internas: quién puede votar y qué votos cuentan
-- ----------------------------------------------------------------------------
-- No se dan a la app: las usan las dos funciones de abajo, que deciden quién
-- puede ver qué.

/*
  Residentes con derecho a voto en una encuesta de «cada residente»: las
  personas CON CUENTA que, por su papel en una vivienda viva del edificio,
  están en la audiencia de la encuesta. Es la misma regla que
  `voto_segun_la_audiencia` usa para dejar votar. Quien no tiene cuenta no
  puede votar, así que tampoco cuenta en el total.
*/
create or replace function public.electores_de_encuesta(p_publicacion_id uuid)
returns table (usuario_id uuid, unidad_id uuid, torre_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select distinct mu.usuario_id, u.id, u.torre_id
  from public.publicacion pub
  join public.unidad u on u.condominio_id = pub.condominio_id and u.deleted_at is null
  join public.membresia_unidad mu on mu.unidad_id = u.id and mu.activo and mu.usuario_id is not null
  where pub.id = p_publicacion_id
    and (
      (pub.para_propietarios and mu.rol = 'propietario')
      or (pub.para_residentes and mu.es_residente and mu.rol <> 'huesped_temporal')
      or (pub.para_huespedes and mu.rol = 'huesped_temporal')
    );
$fn$;

/*
  Los votos que cuentan, uno por votante y opción, con su peso. El votante es
  la vivienda o la persona, según la encuesta. Los votos sin vivienda
  (portería, administración) no cuentan para aprobar: no son ni una vivienda
  ni un residente; se informan aparte como «sin contar».
*/
create or replace function public.votos_que_cuentan(p_publicacion_id uuid)
returns table (opcion_id uuid, votante uuid, peso numeric, unidad_id uuid, torre_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select distinct on (v.opcion_id, case when pub.quien_vota = 'residente' then v.usuario_id else v.unidad_id end)
    v.opcion_id,
    case when pub.quien_vota = 'residente' then v.usuario_id else v.unidad_id end,
    case when pub.quien_vota = 'vivienda' and pub.como_se_cuenta = 'indice'
      then u.indice_votacion else 1::numeric end,
    v.unidad_id,
    u.torre_id
  from public.voto v
  join public.publicacion pub on pub.id = v.publicacion_id
  join public.unidad u on u.id = v.unidad_id
                      and u.condominio_id = pub.condominio_id
                      and u.deleted_at is null
  where v.publicacion_id = p_publicacion_id
  order by v.opcion_id,
           case when pub.quien_vota = 'residente' then v.usuario_id else v.unidad_id end,
           v.emitido_en;
$fn$;

revoke all on function public.electores_de_encuesta(uuid) from public, anon, authenticated;
revoke all on function public.votos_que_cuentan(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. El resultado, calculado en la base
-- ----------------------------------------------------------------------------

create or replace function public.resultado_de_encuesta(p_publicacion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_pub public.publicacion%rowtype;
  v_visible boolean;
  v_por_indice boolean;
  v_cerrada boolean;
  v_electores integer := 0;
  v_total numeric := 0;
  v_participantes integer := 0;
  v_peso_emitido numeric := 0;
  v_sin_contar integer := 0;
  v_opciones jsonb := '[]'::jsonb;
  v_es_si_no boolean := false;
  v_objetivo uuid;
  v_objetivo_etiqueta text;
  v_peso_objetivo numeric := 0;
  v_rival numeric := 0;
  v_necesario numeric;
  v_aprobada boolean;
  v_falta numeric;
  v_empate boolean := false;
begin
  select * into v_pub
  from public.publicacion
  where id = p_publicacion_id and deleted_at is null;

  -- La misma regla de lectura que la encuesta: quien no la ve, no ve nada.
  if v_pub.id is null or v_pub.tipo <> 'encuesta'
     or not public.puede_ver_publicacion(p_publicacion_id) then
    return null;
  end if;

  -- Igual que `resultados_publicacion`: el marcador solo si está a la vista,
  -- o para la administración con permiso de ver encuestas.
  v_visible := public.resultados_a_la_vista(p_publicacion_id)
    or public.puede_coadmin(v_pub.condominio_id, 'visualizarEncuestas');
  v_por_indice := v_pub.quien_vota = 'vivienda' and v_pub.como_se_cuenta = 'indice';
  v_cerrada := v_pub.publicada_hasta is not null and v_pub.publicada_hasta <= now();

  -- El total posible.
  if v_pub.quien_vota = 'residente' then
    select count(distinct e.usuario_id) into v_electores
    from public.electores_de_encuesta(p_publicacion_id) e;
    v_total := v_electores;
  else
    select count(*), coalesce(sum(case when v_por_indice then u.indice_votacion else 1 end), 0)
      into v_electores, v_total
    from public.unidad u
    where u.condominio_id = v_pub.condominio_id and u.deleted_at is null;
  end if;

  -- Quiénes votaron y cuánto pesan, sin decir qué votaron.
  select count(*), coalesce(sum(t.peso), 0) into v_participantes, v_peso_emitido
  from (select distinct q.votante, q.peso from public.votos_que_cuentan(p_publicacion_id) q) t;

  select count(distinct v.usuario_id) into v_sin_contar
  from public.voto v
  left join public.unidad u on u.id = v.unidad_id
  where v.publicacion_id = p_publicacion_id
    and (v.unidad_id is null or u.deleted_at is not null);

  if v_visible then
    -- Peso por opción. «Sí» y «abstención» se reconocen por su texto.
    with conteo as (
      select q.opcion_id, count(*)::int as votos, sum(q.peso) as peso
      from public.votos_que_cuentan(p_publicacion_id) q
      group by q.opcion_id
    ), opciones as (
      select o.id, o.etiqueta, o.orden,
             coalesce(c.votos, 0) as votos,
             coalesce(c.peso, 0) as peso,
             lower(translate(trim(o.etiqueta), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) as normal
      from public.opcion_voto o
      left join conteo c on c.opcion_id = o.id
      where o.publicacion_id = p_publicacion_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'etiqueta', etiqueta, 'votos', votos, 'peso', peso,
             'es_abstencion', normal like '%absten%'
           ) order by orden), '[]'::jsonb),
           bool_or(normal = 'si')
      into v_opciones, v_es_si_no
    from opciones;

    v_es_si_no := coalesce(v_es_si_no, false);

    -- La opción que «se aprueba»: el Sí, o la que va primero.
    select (e->>'id')::uuid, e->>'etiqueta', (e->>'peso')::numeric
      into v_objetivo, v_objetivo_etiqueta, v_peso_objetivo
    from jsonb_array_elements(v_opciones) with ordinality as x(e, n)
    where not (e->>'es_abstencion')::boolean
      and (not v_es_si_no
           or lower(translate(trim(e->>'etiqueta'), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'si')
    order by (e->>'peso')::numeric desc, n
    limit 1;

    select coalesce(max((e->>'peso')::numeric), 0) into v_rival
    from jsonb_array_elements(v_opciones) e
    where not (e->>'es_abstencion')::boolean
      and (e->>'id')::uuid is distinct from v_objetivo;

    v_peso_objetivo := coalesce(v_peso_objetivo, 0);
    v_empate := v_peso_objetivo > 0 and v_peso_objetivo = v_rival;

    if v_pub.regla_aprobacion = 'umbral' then
      v_necesario := v_total * v_pub.umbral_aprobacion / 100;
      -- Viviendas y personas se cuentan enteras: el 70 % de 7 son 5, no 4,9.
      v_necesario := case when v_por_indice then round(v_necesario, 4) else ceil(v_necesario) end;
      v_aprobada := v_total > 0 and v_peso_objetivo >= v_necesario and v_peso_objetivo > v_rival;
      v_falta := greatest(0, v_necesario - v_peso_objetivo);
    else
      v_aprobada := v_peso_objetivo > 0 and v_peso_objetivo > v_rival;
    end if;
  else
    -- Sin el marcador: las opciones van sin números.
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'etiqueta', o.etiqueta) order by o.orden), '[]'::jsonb)
      into v_opciones
    from public.opcion_voto o
    where o.publicacion_id = p_publicacion_id;
    v_objetivo := null;
    v_aprobada := null;
    if v_pub.regla_aprobacion = 'umbral' then
      v_necesario := v_total * v_pub.umbral_aprobacion / 100;
      v_necesario := case when v_por_indice then round(v_necesario, 4) else ceil(v_necesario) end;
    end if;
  end if;

  return jsonb_build_object(
    'quien_vota', v_pub.quien_vota,
    'como_se_cuenta', v_pub.como_se_cuenta,
    'regla', v_pub.regla_aprobacion,
    'umbral_porcentaje', v_pub.umbral_aprobacion,
    'cerrada', v_cerrada,
    'resultados_visibles', v_visible,
    'electores', v_electores,
    'total_posible', v_total,
    'participantes', v_participantes,
    'peso_emitido', v_peso_emitido,
    'sin_contar', v_sin_contar,
    'umbral_necesario', v_necesario,
    'es_si_no', v_es_si_no,
    'opciones', v_opciones,
    'objetivo_id', v_objetivo,
    'objetivo_etiqueta', v_objetivo_etiqueta,
    'empate', case when v_visible then v_empate end,
    'aprobada', v_aprobada,
    'falta', case when v_visible then v_falta end
  );
end;
$fn$;

comment on function public.resultado_de_encuesta(uuid) is
  'El resultado de una encuesta, calculado aquí y no en el celular: total posible (viviendas, índice total o residentes con derecho), participación, peso por opción, umbral necesario, si se aprueba y cuánto falta. Nada si no se ve la encuesta; sin números por opción si los resultados están ocultos.';

revoke all on function public.resultado_de_encuesta(uuid) from public, anon;
grant execute on function public.resultado_de_encuesta(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Participación por torre, para la administración
-- ----------------------------------------------------------------------------
-- Cuántos pueden votar y cuántos votaron en cada torre. Nunca qué votaron:
-- sirve igual en una encuesta secreta.

create or replace function public.participacion_de_encuesta_por_torre(p_publicacion_id uuid)
returns table (torre_id uuid, torre text, electores integer, votaron integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with pub as (
    select p.*
    from public.publicacion p
    where p.id = p_publicacion_id
      and p.deleted_at is null
      and p.tipo = 'encuesta'
      and (public.es_admin_condominio(p.condominio_id)
           or public.puede_coadmin(p.condominio_id, 'visualizarEncuestas'))
  ), electores as (
    select u.torre_id, count(*)::int as n
    from pub join public.unidad u on u.condominio_id = pub.condominio_id and u.deleted_at is null
    where pub.quien_vota = 'vivienda'
    group by u.torre_id
    union all
    select e.torre_id, count(distinct e.usuario_id)::int
    from pub cross join lateral public.electores_de_encuesta(pub.id) e
    where pub.quien_vota = 'residente'
    group by e.torre_id
  ), votaron as (
    select q.torre_id, count(distinct q.votante)::int as n
    from pub cross join lateral public.votos_que_cuentan(pub.id) q
    group by q.torre_id
  )
  select t.id,
         coalesce(nullif(trim(t.nombre), ''), 'Torre ' || t.numero),
         coalesce(e.n, 0),
         coalesce(v.n, 0)
  from pub
  join public.torre t on t.condominio_id = pub.condominio_id and t.deleted_at is null
  left join electores e on e.torre_id = t.id
  left join votaron v on v.torre_id = t.id
  order by t.numero;
$fn$;

comment on function public.participacion_de_encuesta_por_torre(uuid) is
  'Por torre: cuántos pueden votar y cuántos votaron. Solo para la administración. No dice qué votó nadie, así que vale también en una encuesta secreta.';

revoke all on function public.participacion_de_encuesta_por_torre(uuid) from public, anon;
grant execute on function public.participacion_de_encuesta_por_torre(uuid) to authenticated;
