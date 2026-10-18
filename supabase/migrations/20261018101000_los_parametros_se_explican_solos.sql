-- Los parámetros se explican solos y se cambian desde la base (18/10/2026).
--
-- Aditiva: columnas nuevas en una tabla que ya existía, dos tablas nuevas y
-- funciones. No se borra nada.
--
-- El cliente pidió que «absolutamente todo sea parametrizable desde la bd, nada
-- fijo en el código», y que en la base se sepa para qué sirve cada parámetro.
-- `configuracion_plataforma` ya existía (calendario y soporte) y era clave,
-- valor y descripción. Aquí crece para que cada fila diga también qué tipo de
-- valor guarda, en qué unidad, entre qué límites, cuál es su valor de fábrica,
-- si cada edificio puede tener el suyo y qué tan delicado es tocarla.
--
-- Por ahora se cambian **solo desde el panel de Supabase** (decisión del
-- cliente): no hay política de escritura para ninguna sesión de la app.

-- ============================================================================
-- 1. La tabla de parámetros crece
-- ============================================================================

alter table public.configuracion_plataforma
  add column if not exists tipo              public.tipo_parametro not null default 'texto',
  add column if not exists unidad            text,
  add column if not exists minimo            numeric,
  add column if not exists maximo            numeric,
  add column if not exists valor_por_defecto text,
  add column if not exists ambito            public.ambito_parametro not null default 'plataforma',
  add column if not exists categoria         public.categoria_parametro,
  add column if not exists riesgo            public.riesgo_parametro not null default 'bajo',
  add column if not exists es_publico        boolean not null default false;

comment on table public.configuracion_plataforma is
  'Los parámetros de Veciyo: todo valor de negocio que antes estaba escrito en el código '
  '(días, topes, horas, interruptores). Una fila por parámetro. Se cambia desde el panel de '
  'Supabase editando "valor"; cada cambio queda en configuracion_historial. Si un edificio '
  'necesita otro valor y el ámbito es "edificio", va en parametro_condominio.';
comment on column public.configuracion_plataforma.id is 'Identificador de la fila.';
comment on column public.configuracion_plataforma.clave is
  'Nombre del parámetro, en minúsculas y con guiones bajos. Es como lo pide el código: no se renombra.';
comment on column public.configuracion_plataforma.valor is
  'El valor que se usa hoy, como texto. Se valida según "tipo", "minimo" y "maximo" al guardar.';
comment on column public.configuracion_plataforma.descripcion is
  'Para qué sirve, en español simple: qué cambia en la app si se cambia este valor.';
comment on column public.configuracion_plataforma.tipo is
  'Qué clase de valor es (número entero, días, hora del día, sí/no, lista...). Ver el tipo tipo_parametro.';
comment on column public.configuracion_plataforma.unidad is
  'Unidad en que se lee el valor, para quien lo mira: "días", "MB", "minutos". Vacía si no aplica.';
comment on column public.configuracion_plataforma.minimo is
  'Valor más bajo permitido (solo para tipos numéricos). Vacío = sin mínimo.';
comment on column public.configuracion_plataforma.maximo is
  'Valor más alto permitido (solo para tipos numéricos). Vacío = sin máximo.';
comment on column public.configuracion_plataforma.valor_por_defecto is
  'El valor de fábrica, para volver a él si un cambio sale mal. No se usa si "valor" tiene algo.';
comment on column public.configuracion_plataforma.ambito is
  '"plataforma": igual para todos. "edificio": cada edificio puede tener el suyo en parametro_condominio. '
  '"pais": depende del país del edificio.';
comment on column public.configuracion_plataforma.categoria is
  'De qué parte de la app es (cuentas, zonas, antecedentes...). Solo para ordenarlos.';
comment on column public.configuracion_plataforma.riesgo is
  'Qué tan delicado es cambiarlo. "alto" = legal, cobro o seguridad: avisar antes de tocarlo.';
comment on column public.configuracion_plataforma.es_publico is
  'Si la app y la web lo pueden leer (por ejemplo, el tamaño máximo de una foto). '
  'Falso = solo lo leen las funciones del servidor.';
comment on column public.configuracion_plataforma.created_at is 'Cuándo se creó la fila.';
comment on column public.configuracion_plataforma.updated_at is 'Cuándo se cambió por última vez.';

-- Los cuatro que ya había.
update public.configuracion_plataforma set
  tipo = 'minutos', unidad = 'minutos', minimo = 5, maximo = 1440, valor_por_defecto = '60',
  categoria = 'calendario', riesgo = 'bajo',
  descripcion = 'Cada cuántos minutos se vuelve a leer el calendario de Airbnb/Booking de cada alojamiento. '
    'Más bajo = las reservas aparecen antes, pero se consulta más a la plataforma.'
where clave = 'calendario_intervalo_minutos';
update public.configuracion_plataforma set
  tipo = 'entero', unidad = 'alojamientos', minimo = 1, maximo = 500, valor_por_defecto = '50',
  categoria = 'calendario', riesgo = 'bajo',
  descripcion = 'Cuántos calendarios se leen como mucho en cada pasada automática.'
where clave = 'calendario_max_por_pasada';
update public.configuracion_plataforma set
  tipo = 'texto', valor_por_defecto = '', categoria = 'soporte', riesgo = 'bajo', es_publico = true
where clave in ('soporte_correo', 'soporte_whatsapp');

-- ============================================================================
-- 2. Cómo se valida un valor
-- ============================================================================

create or replace function public.motivo_parametro_invalido(
  p_tipo public.tipo_parametro, p_valor text, p_minimo numeric, p_maximo numeric
) returns text
language plpgsql
immutable
set search_path to 'public', 'pg_temp'
as $$
declare
  v_num numeric;
begin
  if p_valor is null then
    return 'El valor no puede quedar vacío (null). Para "sin valor" usa el texto vacío si el tipo es texto.';
  end if;

  if p_tipo in ('entero', 'decimal', 'dias', 'horas', 'minutos', 'segundos', 'megabytes') then
    begin
      v_num := btrim(p_valor)::numeric;
    exception when others then
      return format('"%s" no es un número.', p_valor);
    end;
    if p_tipo in ('entero', 'dias', 'horas', 'minutos', 'segundos') and v_num <> trunc(v_num) then
      return format('"%s" tiene que ser un número entero.', p_valor);
    end if;
    if p_minimo is not null and v_num < p_minimo then
      return format('%s es menor que el mínimo permitido (%s).', v_num, p_minimo);
    end if;
    if p_maximo is not null and v_num > p_maximo then
      return format('%s es mayor que el máximo permitido (%s).', v_num, p_maximo);
    end if;
  elsif p_tipo = 'booleano' then
    if lower(btrim(p_valor)) not in ('true', 'false') then
      return format('"%s" tiene que ser true o false.', p_valor);
    end if;
  elsif p_tipo = 'hora_del_dia' then
    if btrim(p_valor) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      return format('"%s" tiene que ser una hora HH:MM (00:00 a 23:59).', p_valor);
    end if;
  elsif p_tipo = 'lista' then
    begin
      if jsonb_typeof(p_valor::jsonb) <> 'array' then
        return format('"%s" tiene que ser una lista JSON, por ejemplo [7, 3, 1].', p_valor);
      end if;
    exception when others then
      return format('"%s" no es una lista JSON válida, por ejemplo [7, 3, 1].', p_valor);
    end;
  end if;
  return null;
end;
$$;

comment on function public.motivo_parametro_invalido(public.tipo_parametro, text, numeric, numeric) is
  'Dice por qué un valor no sirve para un parámetro de ese tipo y esos límites, o null si sirve. '
  'La usan los disparadores de configuracion_plataforma y parametro_condominio.';

create or replace function public.validar_parametro_plataforma()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_motivo text;
begin
  if new.descripcion is null or btrim(new.descripcion) = '' then
    raise exception 'El parámetro "%" necesita una descripción que diga para qué sirve.', new.clave;
  end if;
  if new.clave !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'La clave "%" va en minúsculas, con guiones bajos y sin espacios.', new.clave;
  end if;
  if new.minimo is not null and new.maximo is not null and new.minimo > new.maximo then
    raise exception 'El parámetro "%": el mínimo (%) es mayor que el máximo (%).', new.clave, new.minimo, new.maximo;
  end if;
  v_motivo := public.motivo_parametro_invalido(new.tipo, new.valor, new.minimo, new.maximo);
  if v_motivo is not null then
    raise exception 'El parámetro "%" no acepta ese valor: %', new.clave, v_motivo;
  end if;
  if new.valor_por_defecto is not null then
    v_motivo := public.motivo_parametro_invalido(new.tipo, new.valor_por_defecto, new.minimo, new.maximo);
    if v_motivo is not null then
      raise exception 'El valor por defecto de "%" no sirve: %', new.clave, v_motivo;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists configuracion_plataforma_validar on public.configuracion_plataforma;
create trigger configuracion_plataforma_validar
  before insert or update on public.configuracion_plataforma
  for each row execute function public.validar_parametro_plataforma();

-- ============================================================================
-- 3. El valor propio de un edificio
-- ============================================================================

create table if not exists public.parametro_condominio (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominio(id) on delete cascade,
  clave         text not null references public.configuracion_plataforma(clave) on update cascade,
  valor         text not null,
  nota          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (condominio_id, clave)
);

comment on table public.parametro_condominio is
  'El valor de un parámetro solo para un edificio, cuando no quiere el general. '
  'Solo para parámetros con ámbito "edificio". Si no hay fila, el edificio usa el valor general.';
comment on column public.parametro_condominio.id is 'Identificador de la fila.';
comment on column public.parametro_condominio.condominio_id is 'El edificio al que se le cambia el valor.';
comment on column public.parametro_condominio.clave is 'El parámetro (clave de configuracion_plataforma).';
comment on column public.parametro_condominio.valor is
  'El valor para este edificio. Se valida con el tipo y los límites del parámetro general.';
comment on column public.parametro_condominio.nota is 'Por qué este edificio tiene otro valor (opcional).';
comment on column public.parametro_condominio.created_at is 'Cuándo se creó la fila.';
comment on column public.parametro_condominio.updated_at is 'Cuándo se cambió por última vez.';

alter table public.parametro_condominio enable row level security;

/* Lectura: quien opera la plataforma y la administración de ese edificio.
   Escritura: ninguna sesión (se cambia desde el panel de Supabase). */
drop policy if exists parametro_condominio_lectura on public.parametro_condominio;
create policy parametro_condominio_lectura on public.parametro_condominio
  for select using (public.es_staff_plataforma() or public.es_admin_condominio(condominio_id));

drop trigger if exists parametro_condominio_tocar_updated_at on public.parametro_condominio;
create trigger parametro_condominio_tocar_updated_at
  before update on public.parametro_condominio
  for each row execute function public.tocar_updated_at();

create or replace function public.validar_parametro_condominio()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  p public.configuracion_plataforma;
  v_motivo text;
begin
  select * into p from public.configuracion_plataforma where clave = new.clave;
  if p.ambito <> 'edificio' then
    raise exception 'El parámetro "%" es de ámbito "%": no se puede cambiar por edificio.', new.clave, p.ambito;
  end if;
  v_motivo := public.motivo_parametro_invalido(p.tipo, new.valor, p.minimo, p.maximo);
  if v_motivo is not null then
    raise exception 'El parámetro "%" no acepta ese valor: %', new.clave, v_motivo;
  end if;
  return new;
end;
$$;

drop trigger if exists parametro_condominio_validar on public.parametro_condominio;
create trigger parametro_condominio_validar
  before insert or update on public.parametro_condominio
  for each row execute function public.validar_parametro_condominio();

-- ============================================================================
-- 4. Quién cambió qué
-- ============================================================================

create table if not exists public.configuracion_historial (
  id              uuid primary key default gen_random_uuid(),
  clave           text not null,
  condominio_id   uuid references public.condominio(id) on delete set null,
  valor_anterior  text,
  valor_nuevo     text,
  cambiado_por    text not null default current_user,
  cambiado_en     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.configuracion_historial is
  'Cada cambio de un parámetro, general o de un edificio: qué valor tenía y cuál quedó. '
  'Se escribe sola; sirve para saber cuándo cambió algo y volver atrás.';
comment on column public.configuracion_historial.id is 'Identificador de la fila.';
comment on column public.configuracion_historial.clave is 'El parámetro que cambió.';
comment on column public.configuracion_historial.condominio_id is
  'El edificio, si el cambio fue en su valor propio. Vacío = cambio del valor general.';
comment on column public.configuracion_historial.valor_anterior is 'El valor antes del cambio (vacío si se creó).';
comment on column public.configuracion_historial.valor_nuevo is 'El valor después del cambio (vacío si se borró).';
comment on column public.configuracion_historial.cambiado_por is
  'Con qué usuario de base de datos se hizo el cambio (el panel de Supabase usa "postgres").';
comment on column public.configuracion_historial.cambiado_en is 'Cuándo.';
comment on column public.configuracion_historial.created_at is 'Cuándo se creó la fila.';
comment on column public.configuracion_historial.updated_at is 'No se edita; igual a created_at.';

alter table public.configuracion_historial enable row level security;
drop policy if exists configuracion_historial_lectura on public.configuracion_historial;
create policy configuracion_historial_lectura on public.configuracion_historial
  for select using (public.es_staff_plataforma());

create or replace function public.anotar_cambio_de_parametro()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  -- Por JSON y no new.campo: las dos tablas comparten el disparador y solo una
  -- tiene condominio_id; pedir el campo a la otra revienta.
  v_nueva jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_vieja jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
begin
  if tg_op = 'UPDATE' and v_nueva->>'valor' is not distinct from v_vieja->>'valor' then
    return new;
  end if;
  insert into public.configuracion_historial (clave, condominio_id, valor_anterior, valor_nuevo)
  values (
    coalesce(v_nueva->>'clave', v_vieja->>'clave'),
    (coalesce(v_nueva, v_vieja)->>'condominio_id')::uuid,
    v_vieja->>'valor',
    v_nueva->>'valor'
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function public.anotar_cambio_de_parametro() from public, anon, authenticated;

drop trigger if exists configuracion_plataforma_historial on public.configuracion_plataforma;
create trigger configuracion_plataforma_historial
  after insert or update or delete on public.configuracion_plataforma
  for each row execute function public.anotar_cambio_de_parametro();

drop trigger if exists parametro_condominio_historial on public.parametro_condominio;
create trigger parametro_condominio_historial
  after insert or update or delete on public.parametro_condominio
  for each row execute function public.anotar_cambio_de_parametro();

-- ============================================================================
-- 5. Cómo se lee
-- ============================================================================

/*
  Interna: el valor efectivo de un parámetro. Primero el del edificio (si el
  ámbito lo permite y hay fila), después el general, y si el general está vacío,
  el de fábrica. Una clave que no existe **revienta**: un nombre mal escrito en
  una función no puede volver null en silencio y caer en un valor escondido.
*/
create or replace function public.parametro(p_clave text, p_condominio_id uuid default null)
returns text
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  p public.configuracion_plataforma;
  v_propio text;
begin
  select * into p from public.configuracion_plataforma where clave = p_clave;
  if not found then
    raise exception 'Parámetro desconocido: "%". Tiene que existir en configuracion_plataforma.', p_clave;
  end if;
  if p_condominio_id is not null and p.ambito = 'edificio' then
    select valor into v_propio from public.parametro_condominio
     where condominio_id = p_condominio_id and clave = p_clave;
    if found then
      return v_propio;
    end if;
  end if;
  return coalesce(nullif(p.valor, ''), p.valor_por_defecto, p.valor);
end;
$$;

comment on function public.parametro(text, uuid) is
  'Interna: el valor efectivo de un parámetro (el del edificio, o el general, o el de fábrica). '
  'Revienta si la clave no existe. No pregunta quién llama: no se concede a las sesiones.';

create or replace function public.parametro_entero(p_clave text, p_condominio_id uuid default null)
returns integer language sql stable security definer set search_path to 'public', 'pg_temp'
as $$ select public.parametro(p_clave, p_condominio_id)::integer $$;

create or replace function public.parametro_decimal(p_clave text, p_condominio_id uuid default null)
returns numeric language sql stable security definer set search_path to 'public', 'pg_temp'
as $$ select public.parametro(p_clave, p_condominio_id)::numeric $$;

create or replace function public.parametro_booleano(p_clave text, p_condominio_id uuid default null)
returns boolean language sql stable security definer set search_path to 'public', 'pg_temp'
as $$ select lower(public.parametro(p_clave, p_condominio_id))::boolean $$;

create or replace function public.parametro_lista(p_clave text, p_condominio_id uuid default null)
returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $$ select public.parametro(p_clave, p_condominio_id)::jsonb $$;

comment on function public.parametro_entero(text, uuid) is 'Interna: parametro() convertido a número entero.';
comment on function public.parametro_decimal(text, uuid) is 'Interna: parametro() convertido a número con decimales.';
comment on function public.parametro_booleano(text, uuid) is 'Interna: parametro() convertido a sí/no.';
comment on function public.parametro_lista(text, uuid) is 'Interna: parametro() convertido a lista JSON.';

revoke execute on function public.parametro(text, uuid) from public, anon, authenticated;
revoke execute on function public.parametro_entero(text, uuid) from public, anon, authenticated;
revoke execute on function public.parametro_decimal(text, uuid) from public, anon, authenticated;
revoke execute on function public.parametro_booleano(text, uuid) from public, anon, authenticated;
revoke execute on function public.parametro_lista(text, uuid) from public, anon, authenticated;
grant execute on function public.parametro(text, uuid) to service_role;
grant execute on function public.parametro_entero(text, uuid) to service_role;
grant execute on function public.parametro_decimal(text, uuid) to service_role;
grant execute on function public.parametro_booleano(text, uuid) to service_role;
grant execute on function public.parametro_lista(text, uuid) to service_role;

/*
  Pública: lo que la app y la web necesitan saber (los marcados es_publico),
  con el valor del edificio si se pide uno. Solo devuelve parámetros públicos,
  así que la puede llamar cualquiera, incluido el huésped sin cuenta.
*/
create or replace function public.parametros_publicos(p_condominio_id uuid default null)
returns table (clave text, valor text, tipo public.tipo_parametro, unidad text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select c.clave, public.parametro(c.clave, p_condominio_id), c.tipo, c.unidad
    from public.configuracion_plataforma c
   where c.es_publico
   order by c.clave;
$$;

comment on function public.parametros_publicos(uuid) is
  'Los parámetros que la app y la web pueden leer (es_publico), con el valor propio del edificio '
  'si se pasa uno. Nunca devuelve parámetros internos.';

revoke execute on function public.parametros_publicos(uuid) from public;
grant execute on function public.parametros_publicos(uuid) to anon, authenticated, service_role;

-- ============================================================================
-- 6. Qué columnas no explican para qué sirven
-- ============================================================================

create or replace function public.columnas_sin_descripcion()
returns table (tabla text, columna text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select c.relname::text, a.attname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join pg_description d on d.objoid = c.oid and d.objsubid = a.attnum
   where c.relkind = 'r'
     and (d.description is null or btrim(d.description) = '')
   order by 1, 2;
$$;

comment on function public.columnas_sin_descripcion() is
  'Interna: las columnas del esquema public sin comentario. La usa la prueba que vigila que '
  'ninguna columna nueva nazca sin explicar para qué sirve.';

revoke execute on function public.columnas_sin_descripcion() from public, anon, authenticated;
grant execute on function public.columnas_sin_descripcion() to service_role;
