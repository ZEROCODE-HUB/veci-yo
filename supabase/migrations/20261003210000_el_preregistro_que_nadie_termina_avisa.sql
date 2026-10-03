-- ----------------------------------------------------------------------------
-- El preregistro que nadie termina avisa solo
-- ----------------------------------------------------------------------------
-- **En todo el proyecto no hay ni una sola tarea periodica.** Ni `pg_cron`, ni
-- un flujo programado, nada. Asi que un huesped que abre su enlace, llena la
-- mitad y lo deja, no vuelve a saber de VeciYo: aparece en la puerta sin
-- registrar y el problema se descubre con el en el vestibulo.
--
-- El dato estaba desde el principio --`precheckin_completado_en is null` y
-- `fecha_desde`-- y el canal tambien --`enviar-correo`--. Faltaba quien
-- preguntara.
--
-- Decidido con el cliente el 03/10/2026: **parametrizable**. «el anfitrion que
-- elija y ya», con 7, 3 y 1 dia como valor por defecto. Lo que elige es a quien
-- se avisa --al huesped, a el, o a los dos-- y con cuanta antelacion.
--
-- ----------------------------------------------------------------------------
-- Por que al huesped se le manda un enlace NUEVO
-- ----------------------------------------------------------------------------
-- Porque el anterior no se puede recuperar: en la base vive solo su sha256, que
-- es justo lo que hace que robar la tabla no sirva para entrar. Un recordatorio
-- sin enlace no le sirve de nada a quien lo recibe, asi que el aviso emite uno
-- y **el anterior deja de valer**.
--
-- Es el precio correcto: quien no ha terminado su preregistro tampoco estaba
-- usando el enlace viejo. Y el anfitrion puede apagarlo si no lo quiere.
--
-- Aditiva: columnas nuevas con valor por defecto, una tabla nueva, y dos
-- extensiones. Nada se borra.

-- 1. Lo que el anfitrion elige -----------------------------------------------

alter table public.suscripcion_renta_corta
  add column if not exists recordatorio_al_huesped   boolean not null default true,
  add column if not exists recordatorio_al_anfitrion boolean not null default true,
  add column if not exists recordatorio_dias         smallint[] not null default '{7,3,1}';

comment on column public.suscripcion_renta_corta.recordatorio_al_huesped is
  'Si al huesped le llega el recordatorio. Apagarlo tiene sentido cuando el anfitrion prefiere hablarle el mismo: cada aviso le emite un enlace nuevo y anula el anterior.';

comment on column public.suscripcion_renta_corta.recordatorio_al_anfitrion is
  'Si al anfitrion le llega el aviso de a quien le falta. No lleva enlace de nadie: le dice el nombre y los dias que quedan.';

comment on column public.suscripcion_renta_corta.recordatorio_dias is
  'Con cuantos dias de antelacion avisar, contando desde la llegada. Por defecto 7, 3 y 1.';

/*
  Un array vacio es la forma de decir «ninguno», y es valida. Lo que no vale es
  un numero absurdo: a 400 dias no hay reserva que valga, y un cero significaria
  avisar el mismo dia de la llegada, cuando ya no da tiempo a nada.

  `not valid` porque las filas de hoy no se tocan --todas tienen el valor por
  defecto, pero la regla se aplica igual de aqui en adelante--.
*/
alter table public.suscripcion_renta_corta
  drop constraint if exists renta_corta_recordatorio_dias_sensatos;

/*
  Va en una funcion y no en linea porque un `check` **no admite subconsultas**
  --`array(select generate_series(...))` lo rechaza Postgres-- y escribir los
  sesenta numeros a mano seria peor de leer que esto.

  `immutable` es obligatorio para que se pueda usar en un `check`: Postgres
  necesita saber que el resultado no cambia con el tiempo ni con la sesion.
*/
create or replace function public.dias_de_recordatorio_sensatos(p_dias smallint[])
returns boolean
language sql
immutable
as $fn$
  select p_dias is null
      or not exists (
           select 1 from unnest(p_dias) d where d < 1 or d > 60
         );
$fn$;

comment on function public.dias_de_recordatorio_sensatos is
  'Un array vacio vale: es «no avisar». Un cero no, porque seria avisar el dia de la llegada, cuando ya no da tiempo a nada; y mas de 60 dias no corresponde a ninguna reserva.';

alter table public.suscripcion_renta_corta
  add constraint renta_corta_recordatorio_dias_sensatos
  check (public.dias_de_recordatorio_sensatos(recordatorio_dias)) not valid;

-- 2. La constancia de lo que ya se mando -------------------------------------

/*
  Sin esto el cron manda el mismo correo cada vez que corre. Y ademas es la
  unica forma de responder «¿se le aviso?», que es la pregunta que hace un
  anfitrion cuando su huesped se planta en la puerta sin registrar.
*/
create table if not exists public.recordatorio_precheckin (
  id            uuid primary key default gen_random_uuid(),
  visita_id     uuid not null references public.visita(id) on delete cascade,

  /** Cual de los hitos: 7, 3, 1... El que el anfitrion haya configurado. */
  dias_antes    smallint not null,

  /** `huesped` o `anfitrion`. Son dos correos distintos y se cuentan aparte. */
  destinatario  text not null check (destinatario in ('huesped', 'anfitrion')),

  correo        text,
  enviado_en    timestamptz not null default now(),

  /*
    Si fallo, por que. Se guarda la fila igualmente: un intento fallido tambien
    es constancia, y sin ella el cron reintentaria en bucle cada hora contra un
    correo que no existe.
  */
  error         text,

  created_at    timestamptz not null default now(),

  constraint recordatorio_una_vez unique (visita_id, dias_antes, destinatario)
);

comment on table public.recordatorio_precheckin is
  'Que recordatorio se mando, a quien y cuando. Es lo que impide repetirlo en cada pasada del cron, y lo que contesta «se le aviso?» cuando alguien llega sin registrar.';

create index if not exists recordatorio_precheckin_visita_idx
  on public.recordatorio_precheckin (visita_id);

alter table public.recordatorio_precheckin enable row level security;

/*
  Lo lee quien puede ver la visita. La escritura la hace el cron con permisos de
  servidor, asi que no hay politica de insert: nadie con sesion tiene por que
  inventarse una constancia de envio.
*/
drop policy if exists recordatorio_precheckin_lectura on public.recordatorio_precheckin;

create policy recordatorio_precheckin_lectura on public.recordatorio_precheckin
  for select to authenticated
  using (public.puede_ver_visita(visita_id));

-- 3. A quien hay que avisar hoy ----------------------------------------------

/*
  Se separa de quien manda los correos a proposito: asi se puede **mirar** --y
  probar-- a quien se iba a avisar sin mandar nada. Un cron que solo se puede
  comprobar mandando correos de verdad no se comprueba nunca.
*/
create or replace function public.precheckins_por_recordar()
returns table (
  visita_id        uuid,
  dias_antes       smallint,
  destinatario     text,
  correo           text,
  nombre           text,
  condominio       text,
  nombre_huesped   text,
  fecha_desde      date
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with pendientes as (
    select
      v.id,
      v.fecha_desde,
      v.condominio_id,
      v.unidad_id,
      (v.fecha_desde - current_date)::smallint as faltan,
      s.recordatorio_al_huesped,
      s.recordatorio_al_anfitrion,
      s.recordatorio_dias,
      t.nombre   as titular_nombre,
      t.correo   as titular_correo
    from public.visita v
    join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    where v.tipo = 'huesped_temporal'
      -- Solo las que tienen enlace abierto y sin cerrar. Una estancia sin
      -- preregistro abierto no tiene nada que recordar.
      and v.precheckin_token_hash is not null
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde >= current_date
      and (v.fecha_desde - current_date)::smallint = any (s.recordatorio_dias)
  )
  -- Al huesped, si el anfitrion lo dejo encendido y hay a donde escribirle.
  select
    p.id, p.faltan, 'huesped'::text, p.titular_correo, p.titular_nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  where p.recordatorio_al_huesped
    and coalesce(btrim(p.titular_correo), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'huesped'
    )

  union all

  -- Y al anfitrion, que es quien responde por la estancia. Su correo sale de su
  -- perfil, no de la membresia: el perfil es donde la persona lo mantiene.
  select
    p.id, p.faltan, 'anfitrion'::text, u.email, pf.nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  join lateral (
    select m.usuario_id
    from public.membresia_unidad m
    where m.unidad_id = p.unidad_id and m.rol = 'propietario' and m.activo
    order by m.created_at
    limit 1
  ) duenio on true
  join auth.users u on u.id = duenio.usuario_id
  left join public.perfil pf on pf.id = duenio.usuario_id
  where p.recordatorio_al_anfitrion
    and coalesce(btrim(u.email), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'anfitrion'
    );
$fn$;

comment on function public.precheckins_por_recordar is
  'A quien toca avisar hoy, segun lo que cada anfitrion configuro. No manda nada: separarlo es lo que deja comprobar el cron sin enviar correos de verdad.';

revoke all on function public.precheckins_por_recordar() from public;
grant execute on function public.precheckins_por_recordar() to authenticated;
