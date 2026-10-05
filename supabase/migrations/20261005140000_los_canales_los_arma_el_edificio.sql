-- ----------------------------------------------------------------------------
-- Los canales los arma el edificio
-- ----------------------------------------------------------------------------
-- Lo pidio el cliente el 02/10/2026: «canales creados al dar de alta el
-- edificio, con nombre y roles, editables».
--
-- Hoy no hay canales: hay **dos grupos fijos**, y lo son en tres sitios a la
-- vez.
--
--   · `ambito_grupo` es un enum de dos valores --`residentes`,
--     `propietarios`-- asi que un tercer canal no se puede ni nombrar;
--   · `conversacion_grupo_unico` es un indice unico por
--     `(condominio_id, ambito)`, asi que no caben dos canales de residentes
--     --ni, con dos valores, mas de dos canales en total--;
--   · y quien pertenece a cada uno esta escrito **en la funcion**, en un
--     `case p_ambito when 'residentes' then ... when 'propietarios' then ...`.
--     Cambiar los roles de un canal era cambiar una politica.
--
-- Y nadie los crea: el unico grupo que existe en la base es de la siembra.
-- `panel_crear_condominio` da de alta el edificio y no deja ningun canal
-- detras, asi que un edificio nuevo nace sin ninguno y sin forma de crearlo.
--
-- ----------------------------------------------------------------------------
-- Los roles van en una tabla, no en el cuerpo de una funcion
-- ----------------------------------------------------------------------------
-- Es la regla 1: el modelo vive en el esquema. Un canal con sus roles en una
-- tabla se edita desde una pantalla; el mismo canal con sus roles dentro de un
-- `case` se edita con una migracion, y eso no es «editable».
--
-- Dos columnas y no una: los roles del proyecto son **dos vocabularios
-- distintos** --`rol_unidad` para quien vive en una vivienda y
-- `rol_condominio` para la administracion y la porteria-- y los dos son enums
-- de verdad. Inventar un tercer enum que los mezclara seria una tercera lista
-- que se desincroniza de las otras dos el primer dia que alguien añada un rol.
--
-- ----------------------------------------------------------------------------
-- El residente entra solo
-- ----------------------------------------------------------------------------
-- Tambien lo pidio: «el residente entra automaticamente al crearse». Y ya es
-- asi, por construccion: la pertenencia a un canal **se deduce** del rol, no
-- se guarda. `participante_conversacion` existe solo para apuntar hasta donde
-- leyo cada quien.
--
-- Esto se mantiene a proposito. Si la pertenencia se guardara, habria que
-- escribir una fila por persona y por canal al dar de alta a alguien, al
-- cambiarle el rol y al darlo de baja, y el dia que una de esas tres se
-- olvidara, el canal se quedaria con gente que ya no vive ahi. Deducirlo no se
-- puede desincronizar.
--
-- Aditiva: tabla nueva y columnas nuevas. Lo unico que se retira son dos
-- restricciones que impedian que hubiera mas de dos canales, y una
-- restriccion no es un dato.

-- ----------------------------------------------------------------------------
-- canal_rol
-- ----------------------------------------------------------------------------

create table if not exists public.canal_rol (
  id               uuid primary key default gen_random_uuid(),
  conversacion_id  uuid not null references public.conversacion(id) on delete cascade,

  -- Exactamente uno de los dos. Son los dos enums que ya existen.
  rol_unidad       public.rol_unidad,
  rol_condominio   public.rol_condominio,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint canal_rol_exactamente_uno
    check ((rol_unidad is null) <> (rol_condominio is null))
);

comment on table public.canal_rol is
  'Que roles pertenecen a un canal. Antes esto vivia dentro de `puede_ver_conversacion_fila`, en un `case` sobre un enum de dos valores, asi que cambiar los roles de un canal era escribir una migracion.';

create unique index if not exists canal_rol_unidad_unico
  on public.canal_rol (conversacion_id, rol_unidad)
  where rol_unidad is not null;

create unique index if not exists canal_rol_condominio_unico
  on public.canal_rol (conversacion_id, rol_condominio)
  where rol_condominio is not null;

create index if not exists canal_rol_conversacion_idx
  on public.canal_rol (conversacion_id);

drop trigger if exists canal_rol_tocar_updated_at on public.canal_rol;
create trigger canal_rol_tocar_updated_at
  before update on public.canal_rol
  for each row execute function public.tocar_updated_at();

-- ----------------------------------------------------------------------------
-- Lo que impedia que hubiera mas de dos canales
-- ----------------------------------------------------------------------------
-- `conversacion_grupo_unico` era `(condominio_id, ambito)`: con el enum de dos
-- valores, dos canales como maximo en todo el edificio. Se sustituye por el
-- nombre, que es lo que de verdad no conviene repetir: dos canales llamados
-- igual en la misma lista no se distinguen.

drop index if exists public.conversacion_grupo_unico;

create unique index if not exists conversacion_canal_nombre_unico
  on public.conversacion (condominio_id, lower(btrim(nombre)))
  where tipo = 'grupo';

-- Y `ambito` deja de ser obligatorio. Se queda en la tabla --no se borra
-- nada-- pero un canal nuevo no lo necesita: sus roles estan en `canal_rol`.
alter table public.conversacion
  drop constraint if exists conversacion_grupo_completo;

alter table public.conversacion
  add constraint conversacion_grupo_completo
  check (tipo <> 'grupo' or btrim(coalesce(nombre, '')) <> '');

comment on column public.conversacion.ambito is
  'Historico. Era el enum que decidia quien pertenecia al grupo; ahora eso esta en `canal_rol`. Se conserva en las dos filas que nacieron con el y no se pide para un canal nuevo.';

-- Un canal se retira sin perder lo que se dijo en el. Borrarlo se llevaria los
-- mensajes por delante --`mensaje` cuelga de `conversacion` con cascade-- y un
-- canal creado por error no puede costar el historial de otro.
alter table public.conversacion
  add column if not exists archivado_en timestamptz;

comment on column public.conversacion.archivado_en is
  'Un canal retirado. No sale en la lista y no admite mensajes nuevos, pero lo dicho se conserva: borrarlo arrastraria los mensajes por el cascade.';

-- ----------------------------------------------------------------------------
-- Quien pertenece a un canal
-- ----------------------------------------------------------------------------
-- Separada de `puede_ver_conversacion_fila` para que se pueda preguntar sola:
-- la pantalla de configuracion necesita saber quien entraria en un canal antes
-- de guardarlo, y un limite que solo se puede comprobar entrando no se
-- comprueba.

create or replace function public.es_del_canal(p_conversacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    -- Por el rol en la vivienda.
    select 1
    from public.canal_rol cr
    join public.conversacion c on c.id = cr.conversacion_id
    join public.membresia_unidad m on m.rol = cr.rol_unidad
    join public.unidad u on u.id = m.unidad_id and u.condominio_id = c.condominio_id
    where cr.conversacion_id = p_conversacion_id
      and cr.rol_unidad is not null
      and m.usuario_id = auth.uid()
      and m.activo
  ) or exists (
    -- O por el rol en el edificio: la administracion, la porteria.
    select 1
    from public.canal_rol cr
    join public.conversacion c on c.id = cr.conversacion_id
    join public.membresia_condominio mc
      on mc.rol = cr.rol_condominio and mc.condominio_id = c.condominio_id
    where cr.conversacion_id = p_conversacion_id
      and cr.rol_condominio is not null
      and mc.usuario_id = auth.uid()
      and mc.activo
  );
$fn$;

comment on function public.es_del_canal(uuid) is
  'Si esta persona pertenece a ese canal, por su rol. No se guarda la pertenencia: se deduce, asi no se puede desincronizar de las membresias.';

revoke all on function public.es_del_canal(uuid) from public;
grant execute on function public.es_del_canal(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- La funcion que decide, con la rama del grupo reescrita
-- ----------------------------------------------------------------------------
-- Las otras dos ramas se copian **tal cual** de `20260923270000`, que es la
-- version vigente: el huesped en los hilos de area, y D-13 --la porteria lee
-- su hilo y la administracion no--.

create or replace function public.puede_ver_conversacion_fila(
  p_tipo           public.tipo_conversacion,
  p_area           public.area_conversacion,
  p_ambito         public.ambito_grupo,
  p_unidad_id      uuid,
  p_condominio_id  uuid,
  p_conversacion_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      -- El huesped entra aqui mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      -- D-13: la porteria, no todo el personal. La administracion tiene su
      -- propio hilo y no entra en este.
      or (p_area = 'seguridad'      and public.es_guardia_de_condominio(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      -- Por los roles del canal...
      public.es_del_canal(p_conversacion_id)
      -- ...y la administracion, que los modera. Esto cambia algo y conviene
      -- decirlo: el canal de propietarios deja de ser privado frente a la
      -- administracion. Sin esto no hay moderacion posible --no se puede
      -- retirar un mensaje que no se ve-- y la moderacion es justo lo que se
      -- pidio. Esta anotado en REVISAR-A-OJO.
      or public.puede_coadmin(p_condominio_id, 'contestarChat')
    else false
  end;
$fn$;

comment on function public.puede_ver_conversacion_fila is
  'Quien ve una conversacion. Un hilo de area lo ven la vivienda y el area que atiende --la porteria, no la administracion: D-13--. Un canal, los roles que tenga declarados en `canal_rol` mas la administracion, que lo modera.';

-- ----------------------------------------------------------------------------
-- Un canal archivado no admite mensajes nuevos
-- ----------------------------------------------------------------------------
-- En un disparador y no en la politica: la politica mira la fila que se
-- inserta, y lo que hay que mirar esta en otra tabla.

create or replace function public.canal_archivado_no_recibe()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_archivado timestamptz;
begin
  select c.archivado_en into v_archivado
  from public.conversacion c
  where c.id = new.conversacion_id;

  if v_archivado is not null then
    raise exception 'Ese canal esta archivado: no admite mensajes nuevos'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists mensaje_no_en_canal_archivado on public.mensaje;
create trigger mensaje_no_en_canal_archivado
  before insert on public.mensaje
  for each row execute function public.canal_archivado_no_recibe();

-- ----------------------------------------------------------------------------
-- RLS de canal_rol
-- ----------------------------------------------------------------------------
-- Se lee si se ve el canal --la pantalla dice «Residentes · propietarios,
-- inquilinos»-- y la escribe la administracion del edificio al que pertenece.

alter table public.canal_rol enable row level security;

drop policy if exists canal_rol_lectura on public.canal_rol;
create policy canal_rol_lectura on public.canal_rol
  for select to authenticated
  using (public.puede_ver_conversacion(conversacion_id));

drop policy if exists canal_rol_escritura on public.canal_rol;
create policy canal_rol_escritura on public.canal_rol
  for all to authenticated
  using (
    exists (
      select 1 from public.conversacion c
      where c.id = conversacion_id
        and c.tipo = 'grupo'
        and public.puede_coadmin(c.condominio_id, 'contestarChat')
    )
  )
  with check (
    exists (
      select 1 from public.conversacion c
      where c.id = conversacion_id
        and c.tipo = 'grupo'
        and public.puede_coadmin(c.condominio_id, 'contestarChat')
    )
  );

-- La administracion cambia el nombre de un canal y lo archiva. `conversacion`
-- no tenia politica de UPDATE ninguna: el nombre existia y no habia forma de
-- cambiarlo.
drop policy if exists conversacion_cambio_canal on public.conversacion;
create policy conversacion_cambio_canal on public.conversacion
  for update to authenticated
  using (tipo = 'grupo' and public.puede_coadmin(condominio_id, 'contestarChat'))
  with check (tipo = 'grupo' and public.puede_coadmin(condominio_id, 'contestarChat'));

comment on policy conversacion_cambio_canal on public.conversacion is
  'Solo canales, y solo la administracion del edificio. Un hilo de area no se renombra: su nombre sale del area.';

-- ----------------------------------------------------------------------------
-- Lo que ya existia se queda con sus roles
-- ----------------------------------------------------------------------------
-- Los dos grupos de la siembra se traducen a `canal_rol` con exactamente los
-- roles que la funcion vieja les daba. Si no, al reescribir la funcion se
-- quedarian sin nadie dentro: el `case` sobre `ambito` ya no existe.
--
-- `residentes` era `m.activo and m.es_residente and m.rol <> 'huesped_temporal'`
-- --el huesped esta de paso-- o sea los cuatro roles de quien vive ahi.

insert into public.canal_rol (conversacion_id, rol_unidad)
select c.id, r.rol
from public.conversacion c
cross join (values
  ('propietario'::public.rol_unidad),
  ('inquilino_lider'),
  ('residente'),
  ('corresidente')
) as r(rol)
where c.tipo = 'grupo' and c.ambito = 'residentes'
on conflict do nothing;

insert into public.canal_rol (conversacion_id, rol_unidad)
select c.id, 'propietario'::public.rol_unidad
from public.conversacion c
where c.tipo = 'grupo' and c.ambito = 'propietarios'
on conflict do nothing;
