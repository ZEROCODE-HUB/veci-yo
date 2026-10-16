-- ----------------------------------------------------------------------------
-- Anuncios para la portería, si quien publica lo elige (15/10/2026, hueco 31)
-- ----------------------------------------------------------------------------
-- La portería veía el tablón entero --todo lo publicado, fuera para quien
-- fuera-- y no tenía en la app dónde leerlo, ni le llegaba el aviso. El
-- cliente lo decidió en una línea: «al realizar anuncios debe ser
-- parametrizable». O sea, una cuarta casilla de audiencia, «Portería», al lado
-- de Propietarios, Residentes y Huéspedes temporales.
--
-- Con eso la portería pasa a ver **solo** lo que va dirigido a ella, igual que
-- el resto: un anuncio para propietarios no le toca. Lo ya publicado queda sin
-- marcar, que es lo que dijo quien lo publicó cuando la casilla no existía.
--
-- Antes de añadir la columna se miró quién devuelve `publicacion` como tipo
-- (AGENTS: «una columna nueva puede romper una función sin tocarla»): nadie.

alter table public.publicacion
  add column if not exists para_porteria boolean not null default false;

comment on column public.publicacion.para_porteria is
  'Si la portería la ve y recibe el aviso. La elige quien publica, como las otras tres casillas de audiencia.';

-- ----------------------------------------------------------------------------
-- Quién la ve
-- ----------------------------------------------------------------------------
-- Una sobrecarga con la casilla nueva, y la de cinco argumentos se deja: la
-- usan la política vieja hasta que se reemplaza aquí abajo, y quitarla no es
-- aditivo. La de cinco ya no la llama nadie después de esta migración.

create or replace function public.puede_ver_publicacion_fila(
  p_condominio_id     uuid,
  p_para_propietarios boolean,
  p_para_residentes   boolean,
  p_para_huespedes    boolean,
  p_para_porteria     boolean,
  p_publicada_desde   timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select
    -- Quien administra, siempre: también lo que todavía no ha salido.
    public.puede_coadmin(p_condominio_id, 'visualizarEncuestas')
    or (
      public.ya_es_su_dia(p_publicada_desde, p_condominio_id)
      and (
        public.audiencia_alcanza(
          p_condominio_id, p_para_propietarios, p_para_residentes, p_para_huespedes)
        -- La portería, solo si va para ella. Antes veía todo.
        or (p_para_porteria and public.es_guardia_de_condominio(p_condominio_id))
      )
    );
$fn$;

comment on function public.puede_ver_publicacion_fila(
  uuid, boolean, boolean, boolean, boolean, timestamptz) is
  'Quién ve una publicación, evaluado sobre sus columnas. La portería, solo lo marcado `para_porteria`.';

revoke all on function public.puede_ver_publicacion_fila(
  uuid, boolean, boolean, boolean, boolean, timestamptz) from public;
grant execute on function public.puede_ver_publicacion_fila(
  uuid, boolean, boolean, boolean, boolean, timestamptz) to authenticated;

drop policy if exists publicacion_lectura on public.publicacion;
create policy publicacion_lectura on public.publicacion
  for select to authenticated
  using (
    public.puede_ver_publicacion_fila(
      condominio_id, para_propietarios, para_residentes, para_huespedes,
      para_porteria, publicada_desde)
  );

create or replace function public.puede_ver_publicacion(p_publicacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce((
    select public.puede_ver_publicacion_fila(
      p.condominio_id, p.para_propietarios, p.para_residentes,
      p.para_huespedes, p.para_porteria, p.publicada_desde)
    from public.publicacion p
    where p.id = p_publicacion_id and p.deleted_at is null
  ), false);
$fn$;

-- ----------------------------------------------------------------------------
-- A quién le llega el aviso
-- ----------------------------------------------------------------------------
-- La misma condición que arriba, en lista: los guardias activos del edificio.

create or replace function public.quien_alcanza_la_publicacion(p_publicacion_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select mu.usuario_id
  from public.publicacion p
  join public.unidad u on u.condominio_id = p.condominio_id
  join public.membresia_unidad mu on mu.unidad_id = u.id
  where p.id = p_publicacion_id
    and mu.usuario_id is not null
    and mu.activo
    -- Sin cuenta no hay bandeja. Es el menor de edad que el propietario
    -- registra, que a propósito no entra a la plataforma.
    and mu.puede_acceder
    and (
      (p.para_propietarios and mu.rol = 'propietario')
      or (p.para_residentes and mu.es_residente and mu.rol <> 'huesped_temporal')
      or (p.para_huespedes and mu.rol = 'huesped_temporal'
          and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date))
    )
  union
  select mc.usuario_id
  from public.publicacion p
  join public.membresia_condominio mc on mc.condominio_id = p.condominio_id
  where p.id = p_publicacion_id
    and p.para_porteria
    and mc.rol = 'guardia'
    and mc.activo
    and mc.usuario_id is not null;
$fn$;

comment on function public.quien_alcanza_la_publicacion(uuid) is
  'Las cuentas a las que llega una publicación, por su audiencia: las tres casillas de vivienda, como `audiencia_alcanza`, y los guardias activos si va para la portería. Interna.';

revoke execute on function public.quien_alcanza_la_publicacion(uuid)
  from public, anon, authenticated;
grant execute on function public.quien_alcanza_la_publicacion(uuid) to service_role;
