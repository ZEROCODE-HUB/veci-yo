-- Los documentos que se piden dependen del país del edificio, y se configuran
-- por país desde el panel de la plataforma.
--
-- Pedido del cliente (25/10/2026): «acorde al país de dónde está el edificio
-- debe solicitarse los documentos, y que sea configurable desde el super
-- admin, por país». Hasta hoy la lista era una sola, escrita en la app y en la
-- web: un edificio de Colombia ofrecía el carné de extranjería de Perú, y uno
-- de Perú, la tarjeta de identidad colombiana. Las reglas del número (solo
-- cifras, largo), si tiene dos caras y si pide la fecha de expedición también
-- estaban repetidas en las dos.
--
-- Ahora todo eso vive aquí, una fila por país y tipo:
--   * `activo`: si se ofrece en ese país;
--   * `para_adultos` / `para_menores`: a quién se le ofrece;
--   * `solo_cifras`, `largo_minimo`, `largo_maximo`: cómo es el número;
--   * `dos_caras`: si hay que fotografiar el reverso;
--   * `pide_fecha_expedicion`: Tus Datos no consulta una cédula de
--     extranjería ni un PPT sin ella.
-- La base lo hace cumplir al guardar un invitado (`invitado_documento_del_pais`).

create table if not exists public.documento_del_pais (
  pais                  char(2) not null references public.pais(codigo) on update cascade,
  tipo                  public.tipo_documento not null,
  etiqueta              text not null,
  activo                boolean not null default false,
  para_adultos          boolean not null default true,
  para_menores          boolean not null default false,
  solo_cifras           boolean not null default false,
  largo_minimo          smallint not null default 4,
  largo_maximo          smallint not null default 20,
  dos_caras             boolean not null default true,
  pide_fecha_expedicion boolean not null default false,
  orden                 smallint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (pais, tipo),
  constraint documento_del_pais_largo check (largo_minimo >= 1 and largo_maximo <= 30 and largo_minimo <= largo_maximo),
  constraint documento_del_pais_etiqueta check (btrim(etiqueta) <> ''),
  constraint documento_del_pais_a_quien check (not activo or para_adultos or para_menores)
);

comment on table public.documento_del_pais is
  'Qué documentos se piden en cada país y cómo es su número. Lo edita el dueño '
  'de la plataforma desde el panel (Más → Países). Una fila por país y tipo; '
  '`activo` dice si se ofrece.';

comment on column public.documento_del_pais.pais is 'El país (código de dos letras) en el que rige esta fila.';
comment on column public.documento_del_pais.tipo is 'El tipo de documento, de la lista de la base.';
comment on column public.documento_del_pais.etiqueta is 'Cómo se llama ese documento en ese país; es lo que ve quien lo elige.';
comment on column public.documento_del_pais.activo is 'Si se pide en ese país. Apagado, no se ofrece y la base no lo acepta en un invitado nuevo.';
comment on column public.documento_del_pais.para_adultos is 'Si se le ofrece a un adulto.';
comment on column public.documento_del_pais.para_menores is 'Si se le ofrece a un menor (registro civil, tarjeta de identidad, pasaporte…).';
comment on column public.documento_del_pais.solo_cifras is 'Si el número lleva solo cifras. Si no, letras y cifras.';
comment on column public.documento_del_pais.largo_minimo is 'Cuántos caracteres tiene como mínimo el número, sin puntos, guiones ni espacios.';
comment on column public.documento_del_pais.largo_maximo is 'Cuántos caracteres tiene como máximo el número, sin puntos, guiones ni espacios.';
comment on column public.documento_del_pais.dos_caras is 'Si tiene reverso: entonces se pide la foto de las dos caras.';
comment on column public.documento_del_pais.pide_fecha_expedicion is 'Si se pide la fecha de expedición (Tus Datos no consulta una cédula de extranjería ni un PPT sin ella).';
comment on column public.documento_del_pais.orden is 'En qué lugar sale en la lista.';
comment on column public.documento_del_pais.created_at is 'Cuándo se creó la fila.';
comment on column public.documento_del_pais.updated_at is 'Cuándo se cambió por última vez.';

alter table public.documento_del_pais enable row level security;

-- Es un catálogo, sin nada de nadie: lo lee cualquiera, también el huésped
-- sin sesión. Se escribe solo por `panel_guardar_documento_del_pais`.
drop policy if exists documento_del_pais_leer on public.documento_del_pais;
create policy documento_del_pais_leer on public.documento_del_pais
  for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.documento_del_pais from anon, authenticated;
grant select on public.documento_del_pais to anon, authenticated;

drop trigger if exists documento_del_pais_tocar_updated_at on public.documento_del_pais;
create trigger documento_del_pais_tocar_updated_at
  before update on public.documento_del_pais
  for each row execute function public.tocar_updated_at();

-- Las filas de partida: todos los tipos en todos los países, apagados, con la
-- etiqueta y las reglas de siempre. Después se encienden los de cada país.
insert into public.documento_del_pais
  (pais, tipo, etiqueta, solo_cifras, largo_minimo, largo_maximo, dos_caras, orden)
select p.codigo, t.tipo, t.etiqueta, t.solo_cifras,
       case when t.solo_cifras then 5 else 4 end,
       case when t.solo_cifras then 12 else 20 end,
       t.dos_caras, t.orden
from public.pais p
cross join (values
  ('cedula_ciudadania'::public.tipo_documento,  'Cédula de ciudadanía',                  true,  true,  1),
  ('cedula_extranjeria'::public.tipo_documento, 'Cédula de extranjería',                 true,  true,  2),
  ('ppt'::public.tipo_documento,                'PPT (Permiso por Protección Temporal)', false, true,  3),
  ('dni'::public.tipo_documento,                'DNI',                                   true,  true,  4),
  ('carne_extranjeria'::public.tipo_documento,  'Carné de extranjería',                  false, true,  5),
  ('pasaporte'::public.tipo_documento,          'Pasaporte',                             false, false, 6),
  ('registro_civil'::public.tipo_documento,     'Registro civil de nacimiento',          false, false, 7),
  ('tarjeta_identidad'::public.tipo_documento,  'Tarjeta de identidad',                  true,  true,  8),
  ('pep'::public.tipo_documento,                'PEP (ya no vigente)',                   false, true,  9)
) t(tipo, etiqueta, solo_cifras, dos_caras, orden)
on conflict (pais, tipo) do nothing;

-- El pasaporte, en todos: es lo que lleva cualquier extranjero.
update public.documento_del_pais
   set activo = true, para_adultos = true, para_menores = true
 where tipo = 'pasaporte';

-- Fuera de Colombia y Perú, el documento nacional, con reglas abiertas: cada
-- país tiene el suyo y el panel lo ajusta.
update public.documento_del_pais
   set activo = true, para_adultos = true, para_menores = true,
       etiqueta = 'Documento nacional de identidad',
       solo_cifras = false, largo_minimo = 4, largo_maximo = 20
 where tipo = 'dni' and pais not in ('CO', 'PE');

-- Colombia. El DNI se queda --peruanos, ecuatorianos y bolivianos pueden
-- entrar con su documento nacional (Comunidad Andina)-- y con reglas abiertas,
-- porque la cédula boliviana puede llevar letras. El carné de extranjería es
-- de Perú: aquí no se ofrece. Los de un menor: registro civil hasta los siete,
-- tarjeta de identidad de los siete a los diecisiete.
update public.documento_del_pais d
   set activo = true,
       para_adultos = c.adultos,
       para_menores = c.menores,
       pide_fecha_expedicion = c.fecha
  from (values
    ('cedula_ciudadania'::public.tipo_documento,  true,  false, false),
    ('cedula_extranjeria'::public.tipo_documento, true,  false, true),
    ('ppt'::public.tipo_documento,                true,  true,  true),
    ('dni'::public.tipo_documento,                true,  true,  false),
    ('registro_civil'::public.tipo_documento,     false, true,  false),
    ('tarjeta_identidad'::public.tipo_documento,  false, true,  false)
  ) c(tipo, adultos, menores, fecha)
 where d.pais = 'CO' and d.tipo = c.tipo;

update public.documento_del_pais
   set etiqueta = 'DNI o cédula de la Comunidad Andina (Perú, Ecuador, Bolivia)',
       solo_cifras = false, largo_minimo = 4, largo_maximo = 20
 where pais = 'CO' and tipo = 'dni';

-- Perú: el DNI, el carné de extranjería y la cédula de los vecinos andinos.
update public.documento_del_pais d
   set activo = true, para_adultos = c.adultos, para_menores = c.menores
  from (values
    ('dni'::public.tipo_documento,               true, true),
    ('carne_extranjeria'::public.tipo_documento, true, true),
    ('cedula_ciudadania'::public.tipo_documento, true, false)
  ) c(tipo, adultos, menores)
 where d.pais = 'PE' and d.tipo = c.tipo;

update public.documento_del_pais
   set etiqueta = 'Cédula de la Comunidad Andina (Colombia, Ecuador, Bolivia)',
       solo_cifras = false, largo_minimo = 4, largo_maximo = 20
 where pais = 'PE' and tipo = 'cedula_ciudadania';

-- Un país nuevo nace con sus filas, apagadas salvo el pasaporte.
create or replace function public.pais_nace_con_sus_documentos()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  insert into public.documento_del_pais
    (pais, tipo, etiqueta, activo, para_adultos, para_menores, solo_cifras,
     largo_minimo, largo_maximo, dos_caras, orden)
  select new.codigo, d.tipo, d.etiqueta, d.tipo = 'pasaporte', true, d.tipo = 'pasaporte',
         d.solo_cifras, d.largo_minimo, d.largo_maximo, d.dos_caras, d.orden
  from public.documento_del_pais d
  where d.pais = 'US'
  on conflict (pais, tipo) do nothing;
  return new;
end;
$$;

revoke all on function public.pais_nace_con_sus_documentos() from public, anon, authenticated;

drop trigger if exists pais_nace_con_sus_documentos on public.pais;
create trigger pais_nace_con_sus_documentos
  after insert on public.pais
  for each row execute function public.pais_nace_con_sus_documentos();

-- --- Leer ------------------------------------------------------------------

create or replace function public.documentos_del_pais(p_pais text)
returns setof public.documento_del_pais
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select d.* from public.documento_del_pais d
  where d.pais = upper(btrim(coalesce(p_pais, '')))
    and d.activo
  order by d.orden, d.etiqueta;
$$;

comment on function public.documentos_del_pais(text) is
  'Los documentos que se ofrecen en ese país, con sus reglas.';

create or replace function public.documentos_del_edificio(p_condominio_id uuid)
returns setof public.documento_del_pais
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select d.* from public.condominio c
  cross join lateral public.documentos_del_pais(c.pais) d
  where c.id = p_condominio_id;
$$;

comment on function public.documentos_del_edificio(uuid) is
  'Los documentos que se ofrecen en el país de ese edificio.';

-- Para el preregistro de la web, que solo tiene el enlace.
create or replace function public.documentos_del_enlace(p_token text)
returns setof public.documento_del_pais
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  -- Los dos enlaces del preregistro: el del titular vive en la visita, el de
  -- un acompañante en su fila de invitado (`quien_trae_este_enlace` solo mira
  -- este último).
  with e as (
    select v.condominio_id from public.visita v
    where v.precheckin_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and v.precheckin_expira_en > now()
    union all
    select v.condominio_id from public.quien_trae_este_enlace(p_token) q
    join public.visita v on v.id = q.visita_id
    limit 1
  )
  select d.* from e cross join lateral public.documentos_del_edificio(e.condominio_id) d;
$$;

comment on function public.documentos_del_enlace(text) is
  'Los documentos que se ofrecen en el país del edificio de ese enlace de '
  'preregistro. Vacío si el enlace no vale.';

-- Quien se registra todavía no es de ningún edificio: se le ofrecen los de
-- los países donde se pueden dar de alta edificios, sin repetir, y con la
-- regla más abierta de las que haya para cada tipo.
drop function if exists public.documentos_para_registrarse();
create or replace function public.documentos_para_registrarse()
returns table (
  tipo public.tipo_documento, etiqueta text, solo_cifras boolean,
  largo_minimo smallint, largo_maximo smallint, dos_caras boolean
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select d.tipo,
         (array_agg(d.etiqueta order by p.orden))[1],
         bool_and(d.solo_cifras),
         min(d.largo_minimo)::smallint,
         max(d.largo_maximo)::smallint,
         bool_or(d.dos_caras)
  from public.documento_del_pais d
  join public.pais p on p.codigo = d.pais
  where d.activo and d.para_adultos and p.activo and p.alta_de_edificio
  group by d.tipo
  order by min(d.orden);
$$;

comment on function public.documentos_para_registrarse() is
  'Los documentos que se ofrecen al crear una cuenta: los de adultos de los '
  'países con alta de edificios, con la regla más abierta de cada tipo.';

grant execute on function public.documentos_del_pais(text) to anon, authenticated;
grant execute on function public.documentos_del_edificio(uuid) to anon, authenticated;
grant execute on function public.documentos_del_enlace(text) to anon, authenticated;
grant execute on function public.documentos_para_registrarse() to anon, authenticated;

-- --- Hacerlo cumplir ---------------------------------------------------------

-- Por qué ese número no sirve con esa regla, o null. La misma regla que
-- `errorDeDocumento` en la app y en la web.
create or replace function public.error_de_documento(
  p_numero text, p_solo_cifras boolean, p_minimo int, p_maximo int
)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  with l as (select upper(regexp_replace(coalesce(p_numero, ''), '[[:space:].-]', '', 'g')) as n)
  select case
    when l.n = '' then null
    when p_solo_cifras and l.n !~ '^[0-9]+$' then 'Ese documento lleva solo números.'
    when not p_solo_cifras and l.n !~ '^[A-Z0-9]+$' then 'El documento lleva solo letras y números, sin símbolos.'
    when length(l.n) < p_minimo or length(l.n) > p_maximo then
      case when p_solo_cifras
        then format('Revisa el número: tiene que tener entre %s y %s cifras.', p_minimo, p_maximo)
        else format('Revisa el documento: tiene que tener entre %s y %s caracteres.', p_minimo, p_maximo)
      end
  end
  from l;
$$;

create or replace function public.invitado_documento_del_pais()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pais  char(2);
  r       public.documento_del_pais%rowtype;
  v_error text;
begin
  if new.tipo_documento is null then
    return new;
  end if;
  -- Solo lo que se escribe ahora: lo ya guardado no se vuelve a juzgar.
  if tg_op = 'UPDATE'
     and new.tipo_documento is not distinct from old.tipo_documento
     and new.documento_numero is not distinct from old.documento_numero then
    return new;
  end if;

  select c.pais into v_pais
  from public.visita v join public.condominio c on c.id = v.condominio_id
  where v.id = new.visita_id;

  select * into r from public.documento_del_pais d
  where d.pais = v_pais and d.tipo = new.tipo_documento;

  if not found then
    return new;
  end if;

  if not r.activo then
    raise exception 'En este edificio no se acepta «%» como documento.', r.etiqueta
      using errcode = 'check_violation', constraint = 'invitado_documento_del_pais';
  end if;

  v_error := public.error_de_documento(new.documento_numero, r.solo_cifras, r.largo_minimo, r.largo_maximo);
  if v_error is not null then
    raise exception '%', v_error
      using errcode = 'check_violation', constraint = 'invitado_documento_del_pais';
  end if;
  return new;
end;
$$;

comment on function public.invitado_documento_del_pais() is
  'Un invitado lleva un documento que se acepta en el país del edificio, con '
  'el número como dice su regla (`documento_del_pais`). Solo al escribirlo.';

revoke all on function public.invitado_documento_del_pais() from public, anon, authenticated;

drop trigger if exists invitado_documento_del_pais on public.invitado;
create trigger invitado_documento_del_pais
  before insert or update of tipo_documento, documento_numero on public.invitado
  for each row execute function public.invitado_documento_del_pais();

-- --- El panel ----------------------------------------------------------------

create or replace function public.panel_paises()
returns table (
  codigo text, nombre text, prefijo text, moneda text, zona_horaria text,
  policia text, etiqueta_fiscal text, mayoria_de_edad smallint,
  reporta_sire boolean, alta_de_edificio boolean, activo boolean,
  edificios integer, documentos jsonb
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve los países'
      using errcode = '42501';
  end if;
  return query
  select p.codigo::text, p.nombre, p.prefijo, btrim(p.moneda), p.zona_horaria,
         p.policia, p.etiqueta_fiscal, p.mayoria_de_edad,
         p.reporta_sire, p.alta_de_edificio, p.activo,
         (select count(*)::int from public.condominio c where c.pais = p.codigo),
         coalesce((
           select jsonb_agg(to_jsonb(d) - 'pais' - 'created_at' - 'updated_at' order by d.orden, d.etiqueta)
           from public.documento_del_pais d where d.pais = p.codigo
         ), '[]'::jsonb)
  from public.pais p
  order by p.orden, p.nombre;
end;
$$;

comment on function public.panel_paises() is
  'Los países con sus datos y sus documentos, para el panel. Equipo de la plataforma.';

create or replace function public.panel_cambiar_pais(p_codigo text, p_cambios jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_antes public.pais%rowtype;
  v_codigo char(2) := upper(btrim(coalesce(p_codigo, '')));
  v_clave text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los países'
      using errcode = '42501';
  end if;

  select * into v_antes from public.pais where codigo = v_codigo;
  if not found then
    raise exception 'No existe el país %', p_codigo;
  end if;

  for v_clave in select jsonb_object_keys(coalesce(p_cambios, '{}'::jsonb)) loop
    if v_clave not in ('nombre', 'prefijo', 'moneda', 'zona_horaria', 'policia',
                       'etiqueta_fiscal', 'mayoria_de_edad', 'reporta_sire',
                       'alta_de_edificio', 'activo') then
      raise exception 'El país no tiene el dato %', v_clave;
    end if;
  end loop;

  if p_cambios ? 'nombre' and btrim(coalesce(p_cambios->>'nombre', '')) = '' then
    raise exception 'El país necesita un nombre';
  end if;
  if p_cambios ? 'prefijo' and coalesce(p_cambios->>'prefijo', '') !~ '^[0-9]{1,4}$' then
    raise exception 'El prefijo telefónico son de 1 a 4 cifras, sin el +';
  end if;
  if nullif(btrim(coalesce(p_cambios->>'moneda', '')), '') is not null
     and not exists (select 1 from public.moneda m where m.codigo = upper(btrim(p_cambios->>'moneda'))) then
    raise exception 'La moneda % no existe', p_cambios->>'moneda';
  end if;
  if nullif(btrim(coalesce(p_cambios->>'zona_horaria', '')), '') is not null
     and not exists (select 1 from pg_timezone_names z where z.name = btrim(p_cambios->>'zona_horaria')) then
    raise exception 'La zona horaria % no existe (se escribe como America/Bogota)', p_cambios->>'zona_horaria';
  end if;
  if p_cambios ? 'mayoria_de_edad'
     and coalesce((p_cambios->>'mayoria_de_edad')::int, 0) not between 14 and 25 then
    raise exception 'La mayoría de edad tiene que estar entre 14 y 25 años';
  end if;
  if (p_cambios->>'alta_de_edificio')::boolean is true
     and not coalesce((p_cambios->>'activo')::boolean, v_antes.activo) then
    raise exception 'Para dar de alta edificios en un país, el país tiene que estar activo';
  end if;
  if (p_cambios->>'activo')::boolean is false
     and exists (select 1 from public.condominio c where c.pais = v_codigo) then
    raise exception 'Hay edificios en este país: no se puede desactivar';
  end if;

  update public.pais set
    nombre           = case when p_cambios ? 'nombre' then btrim(p_cambios->>'nombre') else nombre end,
    prefijo          = case when p_cambios ? 'prefijo' then p_cambios->>'prefijo' else prefijo end,
    moneda           = case when p_cambios ? 'moneda' then nullif(upper(btrim(p_cambios->>'moneda')), '') else moneda end,
    zona_horaria     = case when p_cambios ? 'zona_horaria' then nullif(btrim(p_cambios->>'zona_horaria'), '') else zona_horaria end,
    policia          = case when p_cambios ? 'policia' then nullif(btrim(p_cambios->>'policia'), '') else policia end,
    etiqueta_fiscal  = case when p_cambios ? 'etiqueta_fiscal' then nullif(btrim(p_cambios->>'etiqueta_fiscal'), '') else etiqueta_fiscal end,
    mayoria_de_edad  = case when p_cambios ? 'mayoria_de_edad' then (p_cambios->>'mayoria_de_edad')::smallint else mayoria_de_edad end,
    reporta_sire     = case when p_cambios ? 'reporta_sire' then (p_cambios->>'reporta_sire')::boolean else reporta_sire end,
    alta_de_edificio = case when p_cambios ? 'alta_de_edificio' then (p_cambios->>'alta_de_edificio')::boolean else alta_de_edificio end,
    activo           = case when p_cambios ? 'activo' then (p_cambios->>'activo')::boolean else activo end,
    updated_at       = now()
  where codigo = v_codigo;

  perform public.anotar_en_bitacora(
    'pais_cambiado', null,
    jsonb_build_object('pais', v_codigo, 'cambios', p_cambios));
end;
$$;

comment on function public.panel_cambiar_pais(text, jsonb) is
  'Cambia los datos de un país (solo las claves que vengan). Dueño de la '
  'plataforma. Lo ya creado en ese país --la moneda o la zona de un edificio-- '
  'no cambia: el edificio guarda las suyas al nacer.';

create or replace function public.panel_guardar_documento_del_pais(
  p_pais text, p_tipo public.tipo_documento, p_cambios jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pais char(2) := upper(btrim(coalesce(p_pais, '')));
  v_clave text;
  v_antes public.documento_del_pais%rowtype;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma cambia los documentos'
      using errcode = '42501';
  end if;

  select * into v_antes from public.documento_del_pais where pais = v_pais and tipo = p_tipo;
  if not found then
    raise exception 'No existe ese documento para el país %', p_pais;
  end if;

  for v_clave in select jsonb_object_keys(coalesce(p_cambios, '{}'::jsonb)) loop
    if v_clave not in ('etiqueta', 'activo', 'para_adultos', 'para_menores', 'solo_cifras',
                       'largo_minimo', 'largo_maximo', 'dos_caras', 'pide_fecha_expedicion', 'orden') then
      raise exception 'El documento no tiene el dato %', v_clave;
    end if;
  end loop;

  -- Las comprobaciones de la tabla (largo, etiqueta, a quién) dicen si vale.
  update public.documento_del_pais set
    etiqueta              = case when p_cambios ? 'etiqueta' then btrim(p_cambios->>'etiqueta') else etiqueta end,
    activo                = case when p_cambios ? 'activo' then (p_cambios->>'activo')::boolean else activo end,
    para_adultos          = case when p_cambios ? 'para_adultos' then (p_cambios->>'para_adultos')::boolean else para_adultos end,
    para_menores          = case when p_cambios ? 'para_menores' then (p_cambios->>'para_menores')::boolean else para_menores end,
    solo_cifras           = case when p_cambios ? 'solo_cifras' then (p_cambios->>'solo_cifras')::boolean else solo_cifras end,
    largo_minimo          = case when p_cambios ? 'largo_minimo' then (p_cambios->>'largo_minimo')::smallint else largo_minimo end,
    largo_maximo          = case when p_cambios ? 'largo_maximo' then (p_cambios->>'largo_maximo')::smallint else largo_maximo end,
    dos_caras             = case when p_cambios ? 'dos_caras' then (p_cambios->>'dos_caras')::boolean else dos_caras end,
    pide_fecha_expedicion = case when p_cambios ? 'pide_fecha_expedicion' then (p_cambios->>'pide_fecha_expedicion')::boolean else pide_fecha_expedicion end,
    orden                 = case when p_cambios ? 'orden' then (p_cambios->>'orden')::smallint else orden end
  where pais = v_pais and tipo = p_tipo;

  -- Un país activo no se queda sin ningún documento para un adulto: nadie
  -- podría preregistrarse.
  if exists (select 1 from public.pais p where p.codigo = v_pais and p.activo)
     and not exists (select 1 from public.documento_del_pais d
                     where d.pais = v_pais and d.activo and d.para_adultos) then
    raise exception 'El país se quedaría sin ningún documento para adultos. Activa otro antes.';
  end if;

  perform public.anotar_en_bitacora(
    'documento_de_pais_cambiado', null,
    jsonb_build_object('pais', v_pais, 'tipo', p_tipo, 'cambios', p_cambios));
end;
$$;

comment on function public.panel_guardar_documento_del_pais(text, public.tipo_documento, jsonb) is
  'Cambia cómo se pide un documento en un país (solo las claves que vengan). '
  'Dueño de la plataforma.';

revoke all on function public.panel_paises() from public, anon;
revoke all on function public.panel_cambiar_pais(text, jsonb) from public, anon;
revoke all on function public.panel_guardar_documento_del_pais(text, public.tipo_documento, jsonb) from public, anon;
grant execute on function public.panel_paises() to authenticated;
grant execute on function public.panel_cambiar_pais(text, jsonb) to authenticated;
grant execute on function public.panel_guardar_documento_del_pais(text, public.tipo_documento, jsonb) to authenticated;
