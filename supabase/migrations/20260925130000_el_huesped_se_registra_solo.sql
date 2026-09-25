-- El huesped se registra solo: el esqueleto del precheckin.
--
-- Hasta ahora ser huesped temporal eran DOS cosas distintas que no se
-- conocian entre si (R-26):
--
--   · una `membresia_unidad` nacida de una invitacion por correo --da cuenta,
--     no guarda documento, y no pasa por terminos ni por TRA/SIRE--;
--   · un `invitado` de una `visita` --guarda documento y si pasa por todo lo
--     que la ley pide, pero no da acceso a nada--.
--
-- El resultado era que la persona reportada a la autoridad y la persona que
-- tiene las llaves podian ser distintas. Aqui se decide cual manda: **la
-- estancia es la visita**, y la cuenta cuelga de ella.
--
-- Esta migracion pone solo el esqueleto --columnas y el enlace del token-- y
-- las dos funciones que abren el enlace. Escribir el precheckin y cerrarlo
-- van aparte, para poder comprobar cada trozo antes de apoyar el siguiente.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

-- 1. La persona -------------------------------------------------------------

alter table public.invitado
  add column if not exists correo text,
  add column if not exists es_titular boolean not null default false,
  add column if not exists usuario_id uuid references auth.users(id) on delete set null;

comment on column public.invitado.correo is
  'Solo del titular de la estancia. Los acompañantes no tienen cuenta ni la necesitan: entran con el titular y se les registra el documento igual.';
comment on column public.invitado.es_titular is
  'Quien reservo. Es el unico que recibe el enlace de precheckin y el unico que termina con cuenta.';
comment on column public.invitado.usuario_id is
  'Se rellena cuando el titular acepta su invitacion. Es el hilo que une la cuenta con la estancia: sin el, un huesped no puede saber quien se aloja con el.';

-- Un solo titular por estancia. Sin esto, dos filas marcadas darian dos
-- cuentas para la misma reserva y ninguna forma de decidir cual vale.
create unique index if not exists invitado_un_titular_por_visita
  on public.invitado (visita_id)
  where es_titular;

-- El hilo se recorre al reves --de la cuenta a la estancia-- cada vez que un
-- huesped abre la app, asi que se indexa.
create index if not exists invitado_usuario
  on public.invitado (usuario_id)
  where usuario_id is not null;

-- 2. La estancia ------------------------------------------------------------

alter table public.visita
  add column if not exists precheckin_token_hash text,
  add column if not exists precheckin_expira_en timestamptz,
  add column if not exists precheckin_completado_en timestamptz;

comment on column public.visita.precheckin_token_hash is
  'sha256 del enlace, como en `invitacion`: el token en claro solo existe en el momento de crearlo y en manos del huesped. Si se filtra la tabla, no se filtra el acceso.';
comment on column public.visita.precheckin_completado_en is
  'Cuando el huesped cerro su precheckin. Mientras sea null, el paso 🔗 del timeline esta pendiente de verdad; antes estaba cableado a `true` y se pintaba en verde para todo el mundo, siempre.';

create unique index if not exists visita_precheckin_token
  on public.visita (precheckin_token_hash)
  where precheckin_token_hash is not null;

-- 3. Quien reservo, en lo que ya existe --------------------------------------

-- Las estancias que ya estaban no tienen titular marcado. El de menor `orden`
-- es quien se registro primero, que es quien reservo. No inventa datos: solo
-- nombra lo que ya estaba implicito en el orden.
update public.invitado i
set es_titular = true
where not exists (
        select 1 from public.invitado o
        where o.visita_id = i.visita_id and o.es_titular)
  and i.orden = (
        select min(o.orden) from public.invitado o where o.visita_id = i.visita_id)
  and exists (
        select 1 from public.visita v
        where v.id = i.visita_id and v.tipo = 'huesped_temporal');

-- 4. Abrir el enlace ---------------------------------------------------------

create or replace function public.abrir_precheckin(p_visita_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token   text := encode(extensions.gen_random_bytes(32), 'hex');
  v_unidad  uuid;
  v_tipo    tipo_visita;
  v_hasta   date;
begin
  select unidad_id, tipo, fecha_hasta into v_unidad, v_tipo, v_hasta
  from public.visita where id = p_visita_id;

  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  -- El mismo permiso que invitar a la vivienda: quien la gestiona recibe a su
  -- gente. No se exige ser administracion --el KT dice que el huesped "va por
  -- otro flujo", y este es ese flujo--.
  if not public.puede_invitar_a_unidad(v_unidad) then
    raise exception 'No tenes permiso para abrir el precheckin de esta estancia';
  end if;

  if v_tipo <> 'huesped_temporal' then
    raise exception 'El precheckin es solo de las estancias de huesped';
  end if;

  update public.visita
  set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      -- Caduca con la estancia, no a los siete dias como una invitacion: un
      -- enlace de precheckin que sobrevive a la salida del huesped es una
      -- puerta abierta a los datos de una reserva terminada.
      precheckin_expira_en = coalesce(v_hasta + 1, current_date + 30)::timestamptz
  where id = p_visita_id;

  return v_token;
end;
$$;

comment on function public.abrir_precheckin(uuid) is
  'Genera el enlace de precheckin de una estancia y devuelve el token en claro UNA vez. Volver a llamarla invalida el anterior.';

-- 5. Leerlo sin sesion -------------------------------------------------------

create or replace function public.consultar_precheckin(p_token text)
returns table (
  visita_id uuid,
  condominio text,
  unidad text,
  anfitrion text,
  fecha_desde date,
  fecha_hasta date,
  max_huespedes int,
  vigente boolean,
  completado boolean
)
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select
    v.id,
    c.nombre,
    u.codigo,
    -- El nombre de pila del anfitrion, para que el huesped sepa que el enlace
    -- es de quien le alquilo. El apellido y el correo no hacen falta aqui.
    split_part(coalesce(p.nombre, ''), ' ', 1),
    v.fecha_desde,
    v.fecha_hasta,
    s.max_huespedes,
    (v.precheckin_expira_en > now()),
    (v.precheckin_completado_en is not null)
  from public.visita v
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  left join public.membresia_unidad m
         on m.unidad_id = v.unidad_id and m.rol = 'propietario' and m.activo
  left join public.perfil p on p.id = m.usuario_id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

comment on function public.consultar_precheckin(text) is
  'Lo que ve quien abre el enlace ANTES de identificarse. Devuelve lo justo para reconocer la reserva --edificio, vivienda, fechas, nombre de pila del anfitrion-- y nada de los demas huespedes.';

grant execute on function public.consultar_precheckin(text) to anon, authenticated;
grant execute on function public.abrir_precheckin(uuid) to authenticated;
