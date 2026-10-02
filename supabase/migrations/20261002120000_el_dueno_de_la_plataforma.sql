-- ----------------------------------------------------------------------------
-- El dueño de la plataforma
-- ----------------------------------------------------------------------------
-- Hasta hoy el rol más alto que existía era `administrador`, y su poder acaba
-- en su edificio. Eso está bien y no se toca: el aislamiento entre condominios
-- es la regla 7 y el requisito de seguridad central del producto.
--
-- Lo que no existía era **quien opera la plataforma**: dar de alta un edificio
-- nuevo, atender las quejas que son sobre la aplicación y no sobre el edificio,
-- y saber cuánta gente la usa. Eso se venía haciendo a mano con la clave de
-- servicio, que no deja rastro de quién hizo qué.
--
-- Ese rol **no es un administrador de todos los edificios**. Decisión explícita
-- del 02/10/2026, y es la que da forma a todo este archivo:
--
--   · SÍ ve: la lista de edificios con sus conteos, las PQRS de área
--     `aplicacion`, y los totales de la plataforma.
--   · NO ve: chats, documentos de identidad, correspondencia, visitas,
--     reservas, pagos, votos ni ninguna PQRS del edificio. Nada de una persona
--     concreta.
--
-- Por eso aquí **no hay ni una política nueva de lectura sobre las tablas del
-- dominio**. Lo que el panel necesita sale de funciones `security definer` que
-- devuelven agregados, y lo que devuelven es exactamente lo que se decidió que
-- puede ver. Una política `or es_staff_plataforma()` sobre `condominio` habría
-- sido más corta y habría abierto la puerta de al lado.
--
-- Lo que sigue sin existir a propósito: entrar a mirar un edificio para dar
-- soporte. Se descartó por ahora; si se retoma, va con autorización del
-- administrador y con lo que se mire anotado en la bitácora.

-- ----------------------------------------------------------------------------
-- rol_plataforma y staff_plataforma
-- ----------------------------------------------------------------------------
-- Tabla aparte y **sin `condominio_id`**: esto no es una membresía de un
-- edificio, es de la plataforma. Meterlo en `rol_condominio` habría obligado a
-- colgarlo de algún condominio, y entonces el rol más alto de la plataforma
-- habría vivido dentro de uno de sus inquilinos.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rol_plataforma') then
    create type public.rol_plataforma as enum (
      'dueno',    -- opera la plataforma y reparte este mismo rol
      'soporte'   -- atiende las PQRS de la aplicacion; no reparte roles
    );
  end if;
end $$;

create table if not exists public.staff_plataforma (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null unique references auth.users(id) on delete cascade,
  rol         public.rol_plataforma not null,
  activo      boolean not null default true,
  nota        text,
  -- Quién lo dio de alta. Regla 2: toda acción de una persona sobre un dato
  -- registra quién con una FK real. Aquí importa más que en ningún sitio.
  creado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.staff_plataforma is
  'Quien opera VeciYo. No es una membresia de condominio: no cuelga de ninguno.';
comment on column public.staff_plataforma.rol is
  'dueno reparte este rol; soporte solo atiende las PQRS de la aplicacion.';

alter table public.staff_plataforma enable row level security;

create index if not exists staff_plataforma_usuario_id_idx
  on public.staff_plataforma (usuario_id);


-- ----------------------------------------------------------------------------
-- Quién es quién
-- ----------------------------------------------------------------------------

create or replace function public.es_staff_plataforma()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_plataforma sp
    where sp.usuario_id = auth.uid()
      and sp.activo
  );
$$;

create or replace function public.es_dueno_plataforma()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_plataforma sp
    where sp.usuario_id = auth.uid()
      and sp.activo
      and sp.rol = 'dueno'
  );
$$;

comment on function public.es_staff_plataforma is
  'Opera la plataforma. NO implica ver datos de ningun condominio.';


-- ----------------------------------------------------------------------------
-- Nadie se nombra a sí mismo
-- ----------------------------------------------------------------------------
-- `staff_plataforma` es una afirmación **sobre** una persona, así que esa
-- persona no puede escribirla: la regla ya está en AGENTS.md y la razón es que
-- RLS no sabe comparar el valor viejo con el nuevo. Va en un disparador.
--
-- La primera fila la siembra la clave de servicio, que entra sin `auth.uid()`.
-- Es el único camino, y es a propósito: un sistema donde el primer dueño se
-- puede crear desde la aplicación no tiene dueño, tiene una puerta abierta.

create or replace function public.proteger_staff_plataforma()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_afectado uuid := coalesce(new.usuario_id, old.usuario_id);
begin
  -- Sin sesión: clave de servicio. Es como se siembra el primero.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma reparte este rol';
  end if;

  -- Ni para darse permisos ni para quitarse la responsabilidad.
  if v_afectado = auth.uid() then
    raise exception 'Nadie se cambia su propio rol de plataforma';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists proteger_staff_plataforma on public.staff_plataforma;
create trigger proteger_staff_plataforma
  before insert or update or delete on public.staff_plataforma
  for each row execute function public.proteger_staff_plataforma();

drop policy if exists staff_plataforma_lectura on public.staff_plataforma;
create policy staff_plataforma_lectura on public.staff_plataforma
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff_plataforma());

-- El disparador es el guarda de verdad; la política es el techo.
drop policy if exists staff_plataforma_escritura on public.staff_plataforma;
create policy staff_plataforma_escritura on public.staff_plataforma
  for all to authenticated
  using (public.es_dueno_plataforma())
  with check (public.es_dueno_plataforma());


-- ----------------------------------------------------------------------------
-- bitacora_plataforma
-- ----------------------------------------------------------------------------
-- Lo que se hacía con la clave de servicio no dejaba rastro. Un rol que puede
-- dar de alta edificios y repartir su propio poder tiene que dejarlo.
--
-- No tiene política de INSERT, UPDATE ni DELETE **a propósito**: se escribe
-- solo desde las funciones de este archivo, que son `security definer`. Desde
-- una sesión no se puede añadir una línea falsa ni borrar una verdadera.

create table if not exists public.bitacora_plataforma (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references auth.users(id) on delete set null,
  accion         text not null,
  condominio_id  uuid references public.condominio(id) on delete set null,
  detalle        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

comment on table public.bitacora_plataforma is
  'Lo que hace quien opera la plataforma. Solo se escribe desde las funciones del panel; no se edita ni se borra.';

alter table public.bitacora_plataforma enable row level security;

create index if not exists bitacora_plataforma_created_at_idx
  on public.bitacora_plataforma (created_at desc);
create index if not exists bitacora_plataforma_actor_id_idx
  on public.bitacora_plataforma (actor_id);

drop policy if exists bitacora_plataforma_lectura on public.bitacora_plataforma;
create policy bitacora_plataforma_lectura on public.bitacora_plataforma
  for select to authenticated
  using (public.es_staff_plataforma());

create or replace function public.anotar_en_bitacora(
  p_accion        text,
  p_condominio_id uuid default null,
  p_detalle       jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.bitacora_plataforma (actor_id, accion, condominio_id, detalle)
  values (auth.uid(), p_accion, p_condominio_id, coalesce(p_detalle, '{}'::jsonb));
$$;

-- Que nadie la llame desde una sesión para inventarse una línea.
revoke all on function public.anotar_en_bitacora(text, uuid, jsonb) from public, authenticated, anon;


-- ----------------------------------------------------------------------------
-- Las PQRS sobre la aplicación las lee la plataforma, no el edificio
-- ----------------------------------------------------------------------------
-- Cierra REVISAR-A-OJO 41. `reclamo_lectura` era
-- `creado_por = auth.uid() or es_admin_condominio(condominio_id)`: no miraba el
-- área, así que la administración del edificio leía las quejas dirigidas al
-- soporte de VeciYo. Había 114 así.
--
-- No se arregló entonces porque no había nadie al otro lado a quien dárselas.
-- Ahora sí.
--
-- Es un cambio de comportamiento visible: esas PQRS **desaparecen** de la lista
-- de la administración. Es lo que se quiere.
--
-- `reclamo.destinatario` --el enum `administrador | propietario | aplicacion`,
-- vacío en las 230 filas-- sigue sin usarse. El discriminador es `area`, que es
-- lo que el formulario escribe de verdad; dos columnas para lo mismo es la
-- segunda fuente de verdad que la regla 1 prohíbe. Queda como columna muerta a
-- la espera de que producto decida si significa algo distinto.

drop policy if exists reclamo_lectura on public.reclamo;
create policy reclamo_lectura on public.reclamo
  for select to authenticated
  using (
    creado_por = auth.uid()
    or (area <> 'aplicacion' and public.es_admin_condominio(condominio_id))
    or (area =  'aplicacion' and public.es_staff_plataforma())
  );

drop policy if exists reclamo_gestion on public.reclamo;
create policy reclamo_gestion on public.reclamo
  for update to authenticated
  using (
    (area <> 'aplicacion' and public.es_admin_condominio(condominio_id))
    or (area =  'aplicacion' and public.es_staff_plataforma())
  )
  with check (
    (area <> 'aplicacion' and public.es_admin_condominio(condominio_id))
    or (area =  'aplicacion' and public.es_staff_plataforma())
  );

-- El bucket de adjuntos tiene que decir lo mismo. Su comentario original ya
-- avisaba de que está escrito aquí "para que el bucket y la tabla no puedan
-- divergir"; si se cambia una y no la otra, la administración sigue viendo las
-- fotos de una queja cuyo texto ya no puede leer.
create or replace function public.puede_ver_reclamo(p_reclamo_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.reclamo r
    where r.id = p_reclamo_id
      and (
        r.creado_por = auth.uid()
        or (r.area <> 'aplicacion' and public.es_admin_condominio(r.condominio_id))
        or (r.area =  'aplicacion' and public.es_staff_plataforma())
      )
  );
$$;
