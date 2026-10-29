-- ============================================================================
-- Monedas y listas de opciones, desde el panel de la app (28/10/2026)
-- ============================================================================
--
-- El cliente: «Edificios solo saldremos por ahora con Colombia y Perú (...) en
-- moneda solo COP, soles y dólares». Y que lo que aún era fijo se pueda
-- cambiar desde la app del administrador de la app, pidiendo confirmación.
--
-- 1. Monedas: se apagan EUR, MXN, ARS y CLP (no se borran: puede haber datos
--    viejos con ellas y se pueden volver a encender). El panel las enciende,
--    apaga y renombra, y puede agregar una.
-- 2. Listas (`catalogo_opcion`): `catalogo_info` dice de cada lista cómo se
--    llama, para qué sirve, si admite opciones nuevas y qué datos propios se
--    pueden cambiar. Las que guardan su valor en un enum de la base no admiten
--    opciones nuevas: el valor no cabría en la columna.
--
-- Aditiva. Escribe solo el dueño de la plataforma, por funciones que lo
-- comprueban en su primera línea, y cada cambio va a la bitácora.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Solo COP, PEN y USD
-- ----------------------------------------------------------------------------

update public.moneda set activa = false, updated_at = now()
 where codigo in ('EUR', 'MXN', 'ARS', 'CLP') and activa;

-- ----------------------------------------------------------------------------
-- 2. Lo que se sabe de cada lista
-- ----------------------------------------------------------------------------

create table if not exists public.catalogo_info (
  catalogo      public.nombre_catalogo primary key,
  titulo        text not null,
  descripcion   text not null,
  admite_nuevas boolean not null default false,
  por_pais      boolean not null default false,
  riesgo        public.riesgo_parametro not null default 'bajo',
  campos_extra  jsonb not null default '[]'::jsonb,
  orden         smallint not null default 99,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.catalogo_info is
  'Una fila por lista de `catalogo_opcion`: cómo se llama en el panel, para qué sirve y qué se le puede cambiar.';
comment on column public.catalogo_info.catalogo is 'La lista.';
comment on column public.catalogo_info.titulo is 'Cómo se llama en el panel.';
comment on column public.catalogo_info.descripcion is 'Para qué sirve y dónde se ve, en castellano.';
comment on column public.catalogo_info.admite_nuevas is
  'Si el panel puede agregar opciones. Falso cuando el valor se guarda en un enum de la base o el código decide algo con cada opción.';
comment on column public.catalogo_info.por_pais is 'Si cada opción es de un país (las fuentes de antecedentes, por ejemplo).';
comment on column public.catalogo_info.riesgo is 'Cuánto puede romper un cambio. Alto = legal o reportes al gobierno.';
comment on column public.catalogo_info.campos_extra is
  'Datos propios de cada opción (de su `extra`) que se pueden cambiar: [{clave, etiqueta, tipo: texto|numero|booleano|hora|lista}].';
comment on column public.catalogo_info.orden is 'Orden en el panel.';
comment on column public.catalogo_info.created_at is 'Cuándo se creó la fila.';
comment on column public.catalogo_info.updated_at is 'Cuándo se cambió por última vez.';

alter table public.catalogo_info enable row level security;
drop policy if exists catalogo_info_lectura on public.catalogo_info;
create policy catalogo_info_lectura on public.catalogo_info for select using (true);
grant select on public.catalogo_info to anon, authenticated;

drop trigger if exists catalogo_info_tocar_updated_at on public.catalogo_info;
create trigger catalogo_info_tocar_updated_at before update on public.catalogo_info
  for each row execute function public.tocar_updated_at();

insert into public.catalogo_info (catalogo, titulo, descripcion, admite_nuevas, por_pais, riesgo, campos_extra, orden) values
  ('motivos_de_viaje', 'Motivos de viaje',
   'Lo que elige el huésped en el preregistro. Va al ministerio en la TRA con el nombre de «Nombre en la TRA».',
   false, false, 'alto', '[{"clave": "tra", "etiqueta": "Nombre en la TRA (ministerio)", "tipo": "texto"}]', 1),
  ('responsables_de_menor', 'Quién responde por un menor',
   'Lo que se elige al registrar a un menor en el preregistro.', false, false, 'alto', '[]', 2),
  ('campos_obligatorios_preregistro', 'Campos obligatorios del preregistro',
   'Qué datos tiene que llenar el titular y cada acompañante. La etiqueta es lo que dice el aviso «Falta …».',
   false, false, 'alto',
   '[{"clave": "titular", "etiqueta": "Obligatorio para el titular", "tipo": "booleano"}, {"clave": "acompanante", "etiqueta": "Obligatorio para cada acompañante", "tipo": "booleano"}]', 3),
  ('tipos_de_documento', 'Siglas de los documentos',
   'Cómo se nombra cada documento ante el ministerio (TRA) y ante Tus Datos. El largo y a quién se pide se cambian en Países.',
   false, false, 'alto',
   '[{"clave": "siglas_tra", "etiqueta": "Siglas en la TRA (vacío = se manda como pasaporte)", "tipo": "texto"}, {"clave": "codigo_tusdatos", "etiqueta": "Código en Tus Datos (vacío = no se consulta)", "tipo": "texto"}]', 4),
  ('antecedentes_fuentes_obligatorias', 'Fuentes de antecedentes obligatorias',
   'Las fuentes de Tus Datos que tienen que responder para dar a alguien por limpio, por país. El código es el nombre de la fuente en Tus Datos.',
   true, true, 'alto', '[]', 5),
  ('equipamiento_obligatorio', 'Equipamiento revisado en renta corta',
   'Lo que la administración revisa en una vivienda de renta corta.', false, false, 'medio', '[{"clave": "icono", "etiqueta": "Icono", "tipo": "texto"}]', 6),
  ('tipos_de_vehiculo', 'Tipos de vehículo', 'En visitas, vehículos de residentes, portería y preregistro.', false, false, 'bajo', '[]', 10),
  ('plataformas_de_reserva', 'Plataformas de una reserva', 'De dónde viene una reserva de renta corta.', false, false, 'bajo', '[]', 11),
  ('empresas_de_mensajeria', 'Empresas de mensajería', 'Al registrar un paquete en portería.', true, false, 'bajo', '[]', 12),
  ('oficios_de_profesionales', 'Oficios de profesionales', 'Al registrar a un profesional permanente o temporal.', true, false, 'bajo', '[]', 13),
  ('cargos_equipo_admin', 'Cargos del equipo administrativo', 'Al agregar a alguien al equipo de la administración.', true, false, 'bajo', '[]', 14),
  ('areas_de_pqrs', 'Áreas de PQRS', 'A quién va una PQRS.', false, false, 'medio', '[]', 15),
  ('tipos_de_pqrs', 'Tipos de PQRS', 'Pregunta, queja, reclamo…', false, false, 'medio', '[]', 16),
  ('categorias_de_anuncio', 'Categorías de anuncio', 'Al publicar un anuncio.', false, false, 'bajo', '[]', 17),
  ('motivos_eliminar_cuenta', 'Motivos al eliminar la cuenta', 'Lo que se pregunta al eliminar la cuenta.', true, false, 'bajo', '[]', 18),
  ('horarios_de_entrada', 'Horarios de check-in', 'Los horarios que puede elegir la administración en Permisos de renta corta.', true, false, 'bajo',
   '[{"clave": "desde", "etiqueta": "Desde (HH:MM)", "tipo": "hora"}, {"clave": "hasta", "etiqueta": "Hasta (HH:MM)", "tipo": "hora"}]', 19),
  ('rotacion_tipos', 'Rotación de turnos', 'Cada cuánto rota un turno de portería.', false, false, 'bajo', '[]', 20),
  ('turnos_franjas', 'Franjas de los turnos', 'Los nombres de los turnos y las franjas para filtrarlos.', false, false, 'bajo', '[]', 21),
  ('canales_iniciales', 'Canales de chat iniciales', 'Los grupos de chat con los que nace cada edificio.', false, false, 'bajo', '[]', 22),
  ('torre_opciones', 'Opciones de la ficha de torre', 'Las opciones de los desplegables de una torre.', false, false, 'bajo',
   '[{"clave": "opciones", "etiqueta": "Opciones", "tipo": "lista"}]', 23),
  ('archivo_formatos', 'Formatos de archivo', 'Qué archivos se aceptan en cada sitio y cuánto pueden pesar.', false, false, 'medio',
   '[{"clave": "tope_mb", "etiqueta": "Tamaño máximo (MB)", "tipo": "numero"}, {"clave": "tipos_mime", "etiqueta": "Tipos aceptados", "tipo": "lista"}]', 24),
  ('palabras_de_bloqueo_ical', 'Palabras de bloqueo del calendario', 'Si un evento del calendario externo dice esto, es un bloqueo y no una reserva.', true, false, 'bajo', '[]', 25),
  ('nacionalidades', 'Nacionalidades', 'Las que se pueden elegir en el preregistro. El código es el ISO de dos letras.', true, false, 'medio', '[]', 26)
on conflict (catalogo) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Un código a partir de la etiqueta: «Servientrega Ltda.» → servientrega_ltda
-- ----------------------------------------------------------------------------

create or replace function public.codigo_de_etiqueta(p_etiqueta text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select nullif(btrim(regexp_replace(
           translate(lower(btrim(coalesce(p_etiqueta, ''))),
                     'áéíóúüñàèìòùâêîôûäëïö', 'aeiouunaeiouaeiouaeio'),
           '[^a-z0-9]+', '_', 'g'), '_'), '');
$$;
comment on function public.codigo_de_etiqueta(text) is
  'El código que se guarda para una opción nueva: la etiqueta en minúsculas, sin tildes y con _ en vez de espacios.';

-- ----------------------------------------------------------------------------
-- 4. Monedas en el panel
-- ----------------------------------------------------------------------------

create or replace function public.moneda_en_uso(p_codigo text)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when exists (select 1 from public.condominio c
                 where c.moneda = p_codigo or c.cuota_moneda = p_codigo) then 'la usa un edificio'
    when exists (select 1 from public.zona_comun z where z.moneda = p_codigo) then 'la usa una zona común'
    when exists (select 1 from public.pais p where p.moneda = p_codigo and p.alta_de_edificio)
      then 'es la de un país donde se dan de alta edificios'
    when exists (select 1 from public.precio_plan pp
                 where pp.moneda = p_codigo and (pp.vigente_hasta is null or pp.vigente_hasta > now()))
      then 'la usa un precio vigente'
  end;
$$;
comment on function public.moneda_en_uso(text) is
  'Por qué no se puede apagar una moneda (vacío = se puede).';
revoke all on function public.moneda_en_uso(text) from public, anon, authenticated;

create or replace function public.panel_monedas()
returns table(codigo text, nombre text, decimales smallint, activa boolean, orden smallint, en_uso text)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve las monedas' using errcode = '42501';
  end if;
  return query
  select btrim(m.codigo), m.nombre, m.decimales, m.activa, m.orden, public.moneda_en_uso(m.codigo)
  from public.moneda m
  order by m.activa desc, m.orden, m.codigo;
end;
$$;
comment on function public.panel_monedas() is 'Las monedas, encendidas primero, y si alguna está en uso. Equipo de la plataforma.';

create or replace function public.panel_guardar_moneda(p_codigo text, p_cambios jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_codigo char(3) := upper(btrim(coalesce(p_codigo, '')));
  v_clave text;
  v_en_uso text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia las monedas' using errcode = '42501';
  end if;
  if not exists (select 1 from public.moneda where codigo = v_codigo) then
    raise exception 'No existe la moneda %', p_codigo;
  end if;
  for v_clave in select jsonb_object_keys(coalesce(p_cambios, '{}'::jsonb)) loop
    if v_clave not in ('nombre', 'decimales', 'activa', 'orden') then
      raise exception 'La moneda no tiene el dato %', v_clave;
    end if;
  end loop;
  if p_cambios ? 'nombre' and btrim(coalesce(p_cambios->>'nombre', '')) = '' then
    raise exception 'La moneda necesita un nombre';
  end if;
  if p_cambios ? 'decimales' and coalesce((p_cambios->>'decimales')::int, -1) not between 0 and 4 then
    raise exception 'Los decimales van de 0 a 4';
  end if;
  if (p_cambios->>'activa')::boolean is false then
    v_en_uso := public.moneda_en_uso(v_codigo);
    if v_en_uso is not null then
      raise exception 'No se puede apagar %: %', v_codigo, v_en_uso;
    end if;
  end if;

  update public.moneda set
    nombre     = case when p_cambios ? 'nombre' then btrim(p_cambios->>'nombre') else nombre end,
    decimales  = case when p_cambios ? 'decimales' then (p_cambios->>'decimales')::smallint else decimales end,
    activa     = case when p_cambios ? 'activa' then (p_cambios->>'activa')::boolean else activa end,
    orden      = case when p_cambios ? 'orden' then (p_cambios->>'orden')::smallint else orden end,
    updated_at = now()
  where codigo = v_codigo;

  perform public.anotar_en_bitacora('moneda_cambiada', null,
    jsonb_build_object('moneda', v_codigo, 'cambios', p_cambios));
end;
$$;
comment on function public.panel_guardar_moneda(text, jsonb) is
  'Cambia nombre, decimales, orden o si se ofrece una moneda. No deja apagar una que esté en uso. Dueño de la plataforma.';

create or replace function public.panel_agregar_moneda(p_codigo text, p_nombre text, p_decimales int)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma agrega monedas' using errcode = '42501';
  end if;
  if v_codigo !~ '^[A-Z]{3}$' then
    raise exception 'El código de la moneda son tres letras (ISO 4217), por ejemplo BOB';
  end if;
  if btrim(coalesce(p_nombre, '')) = '' then
    raise exception 'La moneda necesita un nombre';
  end if;
  if coalesce(p_decimales, -1) not between 0 and 4 then
    raise exception 'Los decimales van de 0 a 4';
  end if;
  if exists (select 1 from public.moneda where codigo = v_codigo) then
    raise exception 'La moneda % ya existe: enciéndela en la lista', v_codigo;
  end if;

  insert into public.moneda (codigo, nombre, decimales, activa, orden)
  values (v_codigo, btrim(p_nombre), p_decimales, true,
          (select coalesce(max(orden), 0) + 1 from public.moneda where activa));

  perform public.anotar_en_bitacora('moneda_agregada', null,
    jsonb_build_object('moneda', v_codigo, 'nombre', btrim(p_nombre), 'decimales', p_decimales));
end;
$$;
comment on function public.panel_agregar_moneda(text, text, int) is 'Agrega una moneda encendida. Dueño de la plataforma.';

-- ----------------------------------------------------------------------------
-- 5. Listas en el panel
-- ----------------------------------------------------------------------------

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
    from public.catalogo_info i), '[]'::jsonb);
end;
$$;
comment on function public.panel_listas() is 'Todas las listas con sus opciones (también las apagadas). Equipo de la plataforma.';

create or replace function public.panel_guardar_opcion(p_id uuid, p_cambios jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_antes public.catalogo_opcion%rowtype;
  v_info public.catalogo_info%rowtype;
  v_clave text;
  v_extra jsonb;
  v_campo jsonb;
  v_valor jsonb;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia las listas' using errcode = '42501';
  end if;
  select * into v_antes from public.catalogo_opcion where id = p_id;
  if not found then
    raise exception 'No existe esa opción';
  end if;
  select * into v_info from public.catalogo_info where catalogo = v_antes.catalogo;

  for v_clave in select jsonb_object_keys(coalesce(p_cambios, '{}'::jsonb)) loop
    if v_clave not in ('etiqueta', 'orden', 'activo', 'extra') then
      raise exception 'La opción no tiene el dato %', v_clave;
    end if;
  end loop;
  if p_cambios ? 'etiqueta' and btrim(coalesce(p_cambios->>'etiqueta', '')) = '' then
    raise exception 'La opción necesita un nombre';
  end if;

  -- Del `extra` solo cambian los campos que la lista declara, con su tipo.
  v_extra := v_antes.extra;
  if p_cambios ? 'extra' then
    if jsonb_typeof(p_cambios->'extra') <> 'object' then
      raise exception 'Los datos de la opción van como objeto';
    end if;
    for v_clave, v_valor in select * from jsonb_each(p_cambios->'extra') loop
      select c into v_campo from jsonb_array_elements(coalesce(v_info.campos_extra, '[]'::jsonb)) c
       where c->>'clave' = v_clave;
      if v_campo is null then
        raise exception 'En esta lista no se cambia el dato %', v_clave;
      end if;
      if jsonb_typeof(v_valor) <> 'null' and (
           (v_campo->>'tipo' = 'booleano' and jsonb_typeof(v_valor) <> 'boolean')
        or (v_campo->>'tipo' = 'numero' and jsonb_typeof(v_valor) <> 'number')
        or (v_campo->>'tipo' = 'lista' and jsonb_typeof(v_valor) <> 'array')
        or (v_campo->>'tipo' in ('texto', 'hora') and jsonb_typeof(v_valor) <> 'string')
        or (v_campo->>'tipo' = 'hora' and v_valor #>> '{}' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) then
        raise exception '«%» no tiene el formato que espera (%)', v_campo->>'etiqueta', v_campo->>'tipo';
      end if;
      v_extra := jsonb_set(v_extra, array[v_clave], v_valor, true);
    end loop;
  end if;

  update public.catalogo_opcion set
    etiqueta   = case when p_cambios ? 'etiqueta' then btrim(p_cambios->>'etiqueta') else etiqueta end,
    orden      = case when p_cambios ? 'orden' then (p_cambios->>'orden')::smallint else orden end,
    activo     = case when p_cambios ? 'activo' then (p_cambios->>'activo')::boolean else activo end,
    extra      = v_extra,
    updated_at = now()
  where id = p_id;

  perform public.anotar_en_bitacora('opcion_cambiada', null,
    jsonb_build_object('lista', v_antes.catalogo, 'codigo', v_antes.codigo, 'pais', v_antes.pais,
                       'antes', jsonb_build_object('etiqueta', v_antes.etiqueta, 'orden', v_antes.orden,
                                                   'activo', v_antes.activo, 'extra', v_antes.extra),
                       'cambios', p_cambios));
end;
$$;
comment on function public.panel_guardar_opcion(uuid, jsonb) is
  'Cambia nombre, orden, si se ofrece y los datos propios declarados de una opción. El código no cambia: es lo que guardan los datos. Dueño de la plataforma.';

create or replace function public.panel_agregar_opcion(p_catalogo public.nombre_catalogo, p_etiqueta text, p_codigo text default null, p_pais text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_info public.catalogo_info%rowtype;
  v_codigo text := coalesce(nullif(btrim(coalesce(p_codigo, '')), ''), public.codigo_de_etiqueta(p_etiqueta));
  v_pais char(2) := nullif(upper(btrim(coalesce(p_pais, ''))), '');
  v_id uuid;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma agrega opciones' using errcode = '42501';
  end if;
  select * into v_info from public.catalogo_info where catalogo = p_catalogo;
  if not found or not v_info.admite_nuevas then
    raise exception 'A esta lista no se le agregan opciones desde el panel: el código decide algo con cada una';
  end if;
  if btrim(coalesce(p_etiqueta, '')) = '' or v_codigo is null then
    raise exception 'La opción necesita un nombre';
  end if;
  if v_info.por_pais and v_pais is null then
    raise exception 'Esta lista va por país: elige el país';
  end if;
  if v_pais is not null and not exists (select 1 from public.pais where codigo = v_pais) then
    raise exception 'No existe el país %', p_pais;
  end if;
  if exists (select 1 from public.catalogo_opcion
             where catalogo = p_catalogo and codigo = v_codigo and pais is not distinct from v_pais) then
    raise exception 'Ya hay una opción «%» en esta lista: enciéndela', v_codigo;
  end if;

  insert into public.catalogo_opcion (catalogo, codigo, etiqueta, orden, activo, pais)
  values (p_catalogo, v_codigo, btrim(p_etiqueta),
          (select coalesce(max(orden), 0) + 1 from public.catalogo_opcion where catalogo = p_catalogo),
          true, v_pais)
  returning id into v_id;

  perform public.anotar_en_bitacora('opcion_agregada', null,
    jsonb_build_object('lista', p_catalogo, 'codigo', v_codigo, 'etiqueta', btrim(p_etiqueta), 'pais', v_pais));
  return v_id;
end;
$$;
comment on function public.panel_agregar_opcion(public.nombre_catalogo, text, text, text) is
  'Agrega una opción a una lista que lo admite. El código sale de la etiqueta si no se da. Dueño de la plataforma.';

revoke all on function public.panel_monedas(), public.panel_guardar_moneda(text, jsonb),
  public.panel_agregar_moneda(text, text, int), public.panel_listas(),
  public.panel_guardar_opcion(uuid, jsonb),
  public.panel_agregar_opcion(public.nombre_catalogo, text, text, text) from public, anon;
grant execute on function public.panel_monedas(), public.panel_guardar_moneda(text, jsonb),
  public.panel_agregar_moneda(text, text, int), public.panel_listas(),
  public.panel_guardar_opcion(uuid, jsonb),
  public.panel_agregar_opcion(public.nombre_catalogo, text, text, text) to authenticated;
