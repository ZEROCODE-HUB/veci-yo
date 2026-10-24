-- Suspender una cuenta con su motivo (24/10/2026).
--
-- Pedido del cliente: en el panel, «suspender y obvio que le llegue correo con
-- el motivo, y al ingresar ya le salga algún modal o pantalla de que está
-- suspendido». Hasta hoy el panel solo bloqueaba (`ban_duration`) sin motivo,
-- y quien intentaba entrar leía un error genérico.
--
-- Lo que queda:
--   · `suspension_cuenta`: cada suspensión con su motivo, quién la puso y
--     cuándo se levantó. Es constancia: no se borra, se levanta.
--   · El bloqueo de verdad sigue siendo el de Supabase Auth (lo pone la
--     función `panel-usuarios`); esta tabla dice **por qué**.
--   · `mi_suspension()`: la persona lee la suya, para que la app le enseñe la
--     pantalla con el motivo si tenía la sesión abierta.
--   · `cerrar_sesiones_de()`: interna, para que la suspensión saque a quien
--     estaba dentro sin esperar a que caduque su sesión.
--   · `panel_listar_usuarios` devuelve también el motivo de la suspensión.
-- Aditiva (la función del panel se rehace porque cambia lo que devuelve).

create table if not exists public.suspension_cuenta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  motivo text not null check (length(btrim(motivo)) between 1 and 500),
  suspendida_por uuid references auth.users (id) on delete set null,
  desde timestamptz not null default now(),
  levantada_en timestamptz,
  levantada_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola suspensión vigente por cuenta.
create unique index if not exists suspension_cuenta_una_vigente
  on public.suspension_cuenta (usuario_id) where levantada_en is null;

drop trigger if exists suspension_cuenta_tocar_updated_at on public.suspension_cuenta;
create trigger suspension_cuenta_tocar_updated_at
  before update on public.suspension_cuenta
  for each row execute function public.tocar_updated_at();

alter table public.suspension_cuenta enable row level security;

-- Cada quien ve las suyas; escribir solo con la clave de servicio (la función
-- `panel-usuarios`, después de comprobar que quien pide es dueño).
drop policy if exists suspension_cuenta_propia on public.suspension_cuenta;
create policy suspension_cuenta_propia on public.suspension_cuenta
  for select using (usuario_id = auth.uid());

comment on table public.suspension_cuenta is
  'Suspensiones de cuentas puestas desde el panel de la app, con su motivo. El bloqueo lo hace Supabase Auth; esto dice por qué. No se borra: se levanta.';
comment on column public.suspension_cuenta.id is 'Identificador de la suspensión.';
comment on column public.suspension_cuenta.usuario_id is 'La cuenta suspendida.';
comment on column public.suspension_cuenta.motivo is 'Por qué se suspendió; se le manda por correo y lo ve al intentar usar la app.';
comment on column public.suspension_cuenta.suspendida_por is 'Quién del equipo de la plataforma la suspendió.';
comment on column public.suspension_cuenta.desde is 'Cuándo empezó la suspensión.';
comment on column public.suspension_cuenta.levantada_en is 'Cuándo se reactivó la cuenta; vacío mientras siga suspendida.';
comment on column public.suspension_cuenta.levantada_por is 'Quién del equipo de la plataforma la reactivó.';
comment on column public.suspension_cuenta.created_at is 'Cuándo se anotó.';
comment on column public.suspension_cuenta.updated_at is 'Última vez que se cambió.';

create or replace function public.mi_suspension()
returns table (motivo text, desde timestamptz)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select s.motivo, s.desde
  from public.suspension_cuenta s
  where s.usuario_id = auth.uid() and s.levantada_en is null;
$$;
comment on function public.mi_suspension() is
  'La suspensión vigente de quien pregunta, si tiene: la app le enseña la pantalla de cuenta suspendida con el motivo.';
revoke all on function public.mi_suspension() from public, anon;
grant execute on function public.mi_suspension() to authenticated, service_role;

/*
  Interna: no pregunta quién llama, así que no se concede a nadie con sesión
  (AGENTS.md: `revoke ... from authenticated` no revoca nada, hay que revocar
  de `public`). Las sesiones de refresco cuelgan de la sesión y caen con ella.
*/
create or replace function public.cerrar_sesiones_de(p_usuario_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_cerradas integer;
begin
  delete from auth.sessions where user_id = p_usuario_id;
  get diagnostics v_cerradas = row_count;
  return v_cerradas;
end;
$$;
comment on function public.cerrar_sesiones_de(uuid) is
  'Interna: cierra todas las sesiones de una cuenta (al suspenderla). Solo la clave de servicio.';
revoke all on function public.cerrar_sesiones_de(uuid) from public, anon, authenticated;
grant execute on function public.cerrar_sesiones_de(uuid) to service_role;

-- La lista del panel, con el motivo de la suspensión vigente.
drop function if exists public.panel_listar_usuarios(text, int, int);
create function public.panel_listar_usuarios(
  p_texto text default null,
  p_pagina int default 1,
  p_por_pagina int default 20
)
returns table (
  usuario_id uuid, nombre text, correo text, creada_en timestamptz,
  ultimo_ingreso timestamptz, correo_confirmado boolean, bloqueada boolean,
  edificios jsonb, rol_plataforma text, motivo_suspension text, total bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_q text := lower(btrim(coalesce(p_texto, '')));
  v_por int := least(greatest(coalesce(p_por_pagina, 20), 1), 100);
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve las cuentas';
  end if;

  return query
  with filtradas as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.banned_until,
           coalesce(nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), 'Sin nombre') as nombre
    from auth.users u
    left join public.perfil p on p.id = u.id
    where v_q = ''
       or lower(u.email) like '%' || v_q || '%'
       or lower(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')) like '%' || v_q || '%'
  )
  select f.id,
         f.nombre,
         f.email::text,
         f.created_at,
         f.last_sign_in_at,
         f.email_confirmed_at is not null,
         coalesce(f.banned_until > now(), false),
         -- En qué edificios está y con qué rol. Nada más de su vida en ellos.
         coalesce((
           select jsonb_agg(distinct jsonb_build_object('edificio', x.edificio, 'rol', x.rol))
           from (
             select c.nombre as edificio, m.rol::text as rol
             from public.membresia_unidad m
             join public.unidad un on un.id = m.unidad_id
             join public.condominio c on c.id = un.condominio_id
             where m.usuario_id = f.id and m.activo
             union all
             select c.nombre, mc.rol::text
             from public.membresia_condominio mc
             join public.condominio c on c.id = mc.condominio_id
             where mc.usuario_id = f.id and mc.activo
           ) x
         ), '[]'::jsonb),
         (select sp.rol::text from public.staff_plataforma sp where sp.usuario_id = f.id and sp.activo),
         (select s.motivo from public.suspension_cuenta s where s.usuario_id = f.id and s.levantada_en is null),
         count(*) over ()
  from filtradas f
  order by f.created_at desc
  limit v_por offset (v_pagina - 1) * v_por;
end;
$$;

comment on function public.panel_listar_usuarios(text, int, int) is
  'Panel: las cuentas de la app por páginas, de la más nueva a la más antigua, filtradas por correo o nombre si se escribe algo; con el motivo de su suspensión vigente y el total en cada fila (equipo).';

revoke all on function public.panel_listar_usuarios(text, int, int) from public, anon;
grant execute on function public.panel_listar_usuarios(text, int, int) to authenticated, service_role;
