-- ----------------------------------------------------------------------------
-- Quien autoriza la renta corta, y las casillas de `permiso_vivienda`
-- ----------------------------------------------------------------------------
-- R-77 decia: "`permiso_vivienda` es un panel entero que no se consulta. La
-- pantalla de Permisos escribe ocho banderas y solo dos se leen. Y
-- `huespedes_temporales` es ademas el TERCER interruptor para «este edificio
-- admite renta corta», junto a `limite_renta_corta_condominio` y el estado de
-- la suscripcion. Hay que decidir cual manda antes de conectar nada."
--
-- La decision, tomada aqui y anotada como tal:
--
--   * `permiso_vivienda.huespedes_temporales` es LA autorizacion, en sus dos
--     niveles: la fila del condominio es la regla del edificio, la de la
--     unidad es la excepcion que concede la administracion. Bloquea.
--   * `limite_renta_corta_condominio` se queda SOLO con los numeros, que el
--     KT manda tratar como advertencia (flujo 4.1 paso 5). Su columna
--     `permite_renta_corta` era el duplicado y desaparece.
--   * El `estado` de la suscripcion no es una autorizacion: es el estado
--     comercial del anfitrion.
--
-- Sigue la linea de R-86b: la AUTORIZACION bloquea, los LIMITES NUMERICOS
-- advierten.
--
-- ----------------------------------------------------------------------------
-- El problema de los valores por defecto
-- ----------------------------------------------------------------------------
-- Las ocho banderas son `not null default false`. Como no las leia nadie,
-- **todos los valores que hay hoy son el default, no una decision**: el
-- condominio de prueba tiene `corta_permite_visitas = false`, que si se
-- impusiera prohibiria toda visita del edificio, y `huespedes_temporales =
-- false`, que apagaria el producto entero.
--
-- Asi que pasan a admitir NULL, con el mismo criterio que ya rige en
-- `limites_del_condominio`: **un condominio que no ha dicho nada no esta
-- prohibiendo nada**. Y los valores actuales se migran a NULL, porque
-- ninguno lo eligio una persona.
--
-- En la fila de una unidad, NULL significa ademas "hereda del edificio", que
-- es lo que `permisos_de_unidad` ya intentaba hacer campo a campo (R-85) y no
-- podia, porque con columnas NOT NULL el `coalesce` nunca caia al segundo.
-- ----------------------------------------------------------------------------

alter table public.permiso_vivienda
  alter column entrega_directa        drop not null,
  alter column huespedes_temporales   drop not null,
  alter column diferencia_estancia    drop not null,
  alter column corta_permite_visitas  drop not null,
  alter column corta_permite_ninos    drop not null,
  alter column corta_permite_mascotas drop not null,
  alter column corta_permite_cocheras drop not null,
  alter column corta_estancia_minima  drop not null,
  alter column larga_permite_visitas  drop not null,
  alter column larga_permite_ninos    drop not null,
  alter column larga_permite_mascotas drop not null,
  alter column larga_permite_cocheras drop not null,
  alter column larga_estancia_minima  drop not null;

alter table public.permiso_vivienda
  alter column entrega_directa        drop default,
  alter column huespedes_temporales   drop default,
  alter column diferencia_estancia    drop default,
  alter column corta_permite_visitas  drop default,
  alter column corta_permite_ninos    drop default,
  alter column corta_permite_mascotas drop default,
  alter column corta_permite_cocheras drop default,
  alter column corta_estancia_minima  drop default,
  alter column larga_permite_visitas  drop default,
  alter column larga_permite_ninos    drop default,
  alter column larga_permite_mascotas drop default,
  alter column larga_permite_cocheras drop default;

comment on column public.permiso_vivienda.huespedes_temporales is
  'La autorizacion de renta corta. NULL = el edificio no ha dicho nada (no prohibe). En la fila de una unidad, la excepcion que concede la administracion.';


-- Ninguna de estas banderas la eligio una persona: se leyeron del default de
-- la columna. Se vacian para que la primera que se ponga signifique algo.
-- `entrega_directa` NO se toca: esa si se impone desde 20260923111000 y
-- vaciarla cambiaria el comportamiento hacia el lado permisivo.
update public.permiso_vivienda
set huespedes_temporales   = null,
    corta_permite_visitas  = null,
    corta_permite_ninos    = null,
    corta_permite_mascotas = null,
    corta_permite_cocheras = null,
    larga_permite_visitas  = null,
    larga_permite_ninos    = null,
    larga_permite_mascotas = null,
    larga_permite_cocheras = null;


-- `permite_renta_corta` era el duplicado de `huespedes_temporales`. La tabla
-- se queda con lo que el KT manda advertir: el minimo de noches y el aforo.
alter table public.limite_renta_corta_condominio
  drop column if exists permite_renta_corta;

comment on table public.limite_renta_corta_condominio is
  'Limites numericos del edificio para la renta corta. Se ADVIERTEN, no se imponen (KT flujo 4.1 paso 5). La autorizacion vive en permiso_vivienda.huespedes_temporales.';


-- La autorizacion resuelta: la excepcion de la vivienda manda sobre la regla
-- del edificio, y si nadie dijo nada no se prohibe.
create or replace function public.autorizacion_renta_corta(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.huespedes_temporales
                   from public.permisos_de_unidad(p_unidad_id) p), true);
$$;

comment on function public.autorizacion_renta_corta(uuid) is
  'Si esta vivienda puede tener renta corta. La excepcion de la unidad manda sobre la regla del edificio; sin regla, no hay prohibicion.';


-- `limites_del_condominio` devolvia esa columna.
drop function if exists public.limites_del_condominio(uuid);

create or replace function public.limites_del_condominio(p_unidad_id uuid)
returns table (
  permite_renta_corta      boolean,
  estancia_minima_noches   integer,
  capacidad_maxima         integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.autorizacion_renta_corta(p_unidad_id),
    l.estancia_minima_noches,
    l.capacidad_maxima
  from public.unidad u
  left join public.limite_renta_corta_condominio l on l.condominio_id = u.condominio_id
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_miembro_condominio(u.condominio_id)
    );
$$;

comment on function public.limites_del_condominio(uuid) is
  'Lo que la pantalla de suscripcion tiene que advertir. La autorizacion viene resuelta; los numeros son advertencia.';


-- ----------------------------------------------------------------------------
-- Las reglas que aplican a una vivienda
-- ----------------------------------------------------------------------------
-- La pantalla de Permisos, cuando "¿su edificio diferencia estancia corta de
-- larga?" esta apagado, edita UN solo juego de campos y lo guarda en los
-- `corta_*`; los `larga_*` se quedan con lo que hubiera. Asi que con la
-- diferenciacion apagada el juego bueno es el corto, y leer `larga_*` seria
-- leer basura. Esto lo resuelve aqui y no cada sitio que pregunte.
create or replace function public.reglas_de_estancia(p_unidad_id uuid)
returns table (
  permite_visitas   boolean,
  permite_ninos     boolean,
  permite_mascotas  boolean,
  permite_cocheras  boolean,
  estancia_minima   integer,
  estancia_maxima   integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with p as (select * from public.permisos_de_unidad(p_unidad_id)),
  -- La vivienda esta en estancia corta si hoy aloja a un huesped temporal.
  corta as (
    select exists (
      select 1 from public.membresia_unidad m
      where m.unidad_id = p_unidad_id
        and m.rol = 'huesped_temporal'
        and m.activo
        and (m.vigente_desde is null or m.vigente_desde <= current_date)
        and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
    ) as si
  )
  select
    case when u.corto then p.corta_permite_visitas  else p.larga_permite_visitas  end,
    case when u.corto then p.corta_permite_ninos    else p.larga_permite_ninos    end,
    case when u.corto then p.corta_permite_mascotas else p.larga_permite_mascotas end,
    case when u.corto then p.corta_permite_cocheras else p.larga_permite_cocheras end,
    case when u.corto then p.corta_estancia_minima  else p.larga_estancia_minima  end,
    case when u.corto then p.corta_estancia_maxima  else p.larga_estancia_maxima  end
  from p
  cross join corta
  cross join lateral (
    select (not coalesce(p.diferencia_estancia, false)) or corta.si as corto
  ) u;
$$;

comment on function public.reglas_de_estancia(uuid) is
  'El juego de reglas que aplica a una vivienda ahora mismo. Sin diferenciacion manda el juego corto, que es el unico que la pantalla edita.';


-- ----------------------------------------------------------------------------
-- Lo que se impone
-- ----------------------------------------------------------------------------
create or replace function public.respetar_autorizacion_renta_corta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Cancelar una suscripcion siempre se puede; lo que se controla es tenerla
  -- activa donde el edificio no la autoriza.
  if new.estado <> 'activa' then
    return new;
  end if;

  if not public.autorizacion_renta_corta(new.unidad_id) then
    raise exception 'Este edificio no autoriza la renta corta en esta vivienda';
  end if;

  return new;
end;
$$;

drop trigger if exists suscripcion_renta_corta_autorizacion on public.suscripcion_renta_corta;
create trigger suscripcion_renta_corta_autorizacion
  before insert or update on public.suscripcion_renta_corta
  for each row execute function public.respetar_autorizacion_renta_corta();


create or replace function public.respetar_permite_visitas()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_permite boolean;
begin
  -- Una visita de la administracion no es visita de nadie en particular.
  if new.unidad_id is null or new.para_administracion then
    return new;
  end if;

  select r.permite_visitas into v_permite
  from public.reglas_de_estancia(new.unidad_id) r;

  if v_permite is false then
    raise exception 'Esta vivienda no tiene autorizadas las visitas';
  end if;

  return new;
end;
$$;

drop trigger if exists visita_permite_visitas on public.visita;
create trigger visita_permite_visitas
  before insert on public.visita
  for each row execute function public.respetar_permite_visitas();


create or replace function public.respetar_permite_ninos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad  uuid;
  v_permite boolean;
begin
  if not coalesce(new.es_menor, false) then
    return new;
  end if;

  select v.unidad_id into v_unidad from public.visita v where v.id = new.visita_id;
  if v_unidad is null then
    return new;
  end if;

  select r.permite_ninos into v_permite
  from public.reglas_de_estancia(v_unidad) r;

  if v_permite is false then
    raise exception 'Esta vivienda no tiene autorizada la entrada de menores';
  end if;

  return new;
end;
$$;

drop trigger if exists invitado_permite_ninos on public.invitado;
create trigger invitado_permite_ninos
  before insert or update on public.invitado
  for each row execute function public.respetar_permite_ninos();


create or replace function public.respetar_permite_cocheras()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad  uuid;
  v_permite boolean;
begin
  select v.unidad_id into v_unidad from public.visita v where v.id = new.visita_id;
  if v_unidad is null then
    return new;
  end if;

  select r.permite_cocheras into v_permite
  from public.reglas_de_estancia(v_unidad) r;

  if v_permite is false then
    raise exception 'Esta vivienda no tiene autorizadas las cocheras de visita';
  end if;

  return new;
end;
$$;

drop trigger if exists vehiculo_visita_permite_cocheras on public.vehiculo_visita;
create trigger vehiculo_visita_permite_cocheras
  before insert on public.vehiculo_visita
  for each row execute function public.respetar_permite_cocheras();


-- ----------------------------------------------------------------------------
-- La que no se puede conectar
-- ----------------------------------------------------------------------------
-- `permite_mascotas` no tiene donde engancharse: no hay ninguna tabla que
-- registre una mascota, ni de un residente ni de un huesped. Se declara en el
-- precheckin, que existe como diseño en `veciyo-web` y no habla con la base
-- (R-93). Conectarla ahora seria inventarse el dato.
comment on column public.permiso_vivienda.corta_permite_mascotas is
  'Sin efecto todavia: no hay tabla de mascotas donde comprobarlo. Se declara en el precheckin (R-93).';

comment on column public.permiso_vivienda.larga_permite_mascotas is
  'Sin efecto todavia: no hay tabla de mascotas donde comprobarlo. Se declara en el precheckin (R-93).';

-- Los minimos y maximos de estancia NO se imponen: el KT los manda mostrar
-- como advertencia (flujo 4.1 paso 5), y ese es el sitio de
-- `limites_del_condominio`.
comment on column public.permiso_vivienda.corta_estancia_maxima is
  'Advertencia, no limite duro. KT flujo 4.1 paso 5.';
