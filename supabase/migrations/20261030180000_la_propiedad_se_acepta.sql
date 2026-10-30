-- La propiedad se acepta, y cada estacionamiento y depósito por separado
-- (30/10/2026).
--
-- Pedido del cliente (Para Claude 183), que reemplaza al del 29/10/2026
-- (pedido 134: «asignado sin aceptar»): cuando la administración asigna a
-- alguien a una vivienda, ya no queda asignado solo. La persona entra en la
-- app sin nada y ve en Inicio el aviso de que tiene una invitación; la abre,
-- revisa a qué vivienda corresponde y acepta los términos. Después, si la
-- vivienda tiene estacionamientos o depósitos, cada uno se le presenta aparte,
-- con sus términos, y solo queda suyo si lo acepta. Lo que no acepta se suelta
-- de la vivienda.
--
-- Qué cambia:
--   · `asignar_propietario` deja siempre una invitación pendiente --tenga o no
--     cuenta-- y le apunta los estacionamientos y depósitos que la vivienda
--     tiene en ese momento (`invitacion_espacio`). Devuelve `asignado` = si
--     esa persona ya tiene cuenta, para que la pantalla lo diga.
--   · `reclamar_asignaciones` ya no convierte nada: solo cuenta lo pendiente.
--   · Tres funciones nuevas para la persona invitada: ver lo suyo, aceptar o
--     rechazar la vivienda, y aceptar o rechazar cada espacio.
--   · Tres textos de términos, parametrizables desde el panel.
--
-- Solo aditiva: una tabla nueva, tres ajustes nuevos y funciones
-- reemplazadas; no se borra nada.

insert into public.configuracion_plataforma (clave, valor, descripcion, tipo, categoria, valor_por_defecto)
values
  ('terminos_propiedad',
   'Al aceptar, confirmas que eres propietario o copropietario de esta vivienda y que los datos son correctos. Te comprometes a cumplir el reglamento del edificio y a mantener al día tus datos de contacto.',
   'Términos que acepta quien recibe la invitación a una vivienda como propietario, antes de que quede asignada (30/10/2026).',
   'texto', 'legal',
   'Al aceptar, confirmas que eres propietario o copropietario de esta vivienda y que los datos son correctos. Te comprometes a cumplir el reglamento del edificio y a mantener al día tus datos de contacto.'),
  ('terminos_estacionamiento',
   'Al aceptar, este estacionamiento queda asignado a tu vivienda. Su uso sigue el reglamento del edificio.',
   'Términos de un estacionamiento asignado con la vivienda; se acepta aparte (30/10/2026).',
   'texto', 'legal',
   'Al aceptar, este estacionamiento queda asignado a tu vivienda. Su uso sigue el reglamento del edificio.'),
  ('terminos_deposito',
   'Al aceptar, este depósito queda asignado a tu vivienda. Su uso sigue el reglamento del edificio.',
   'Términos de un depósito asignado con la vivienda; se acepta aparte (30/10/2026).',
   'texto', 'legal',
   'Al aceptar, este depósito queda asignado a tu vivienda. Su uso sigue el reglamento del edificio.')
on conflict (clave) do nothing;

create table if not exists public.invitacion_espacio (
  id uuid primary key default gen_random_uuid(),
  invitacion_id uuid not null references public.invitacion(id) on delete cascade,
  estacionamiento_id uuid references public.estacionamiento(id) on delete cascade,
  deposito_id uuid references public.deposito(id) on delete cascade,
  estado public.estado_invitacion not null default 'pendiente',
  resuelto_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitacion_espacio_uno_solo check (
    (estacionamiento_id is not null)::int + (deposito_id is not null)::int = 1
  )
);

comment on table public.invitacion_espacio is
  'Los estacionamientos y depósitos que van con una invitación de propietario. Cada uno se acepta aparte y solo queda en la vivienda si se acepta (Para Claude 183, 30/10/2026).';

create index if not exists invitacion_espacio_por_invitacion on public.invitacion_espacio (invitacion_id);

alter table public.invitacion_espacio enable row level security;

-- La administración del edificio los ve; la persona invitada, por sus
-- funciones (`mis_invitaciones_pendientes`), que comprueban su correo.
drop policy if exists invitacion_espacio_lectura on public.invitacion_espacio;
create policy invitacion_espacio_lectura on public.invitacion_espacio
  for select using (
    exists (
      select 1 from public.invitacion i
      where i.id = invitacion_id and public.es_admin_condominio(i.condominio_id)
    )
  );

grant select on public.invitacion_espacio to authenticated;

drop trigger if exists invitacion_espacio_tocar_updated_at on public.invitacion_espacio;
create trigger invitacion_espacio_tocar_updated_at
  before update on public.invitacion_espacio
  for each row execute function public.tocar_updated_at();

-- La asignación queda siempre pendiente de aceptar.
create or replace function public.asignar_propietario(p_unidad_id uuid, p_correo text, p_nombre text)
 returns table(asignado boolean, unidad text, edificio text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
declare
  v_condominio uuid;
  v_codigo     text;
  v_edificio   text;
  v_correo     text := lower(btrim(p_correo));
  v_nombre     text := btrim(coalesce(p_nombre, ''));
  v_tiene_cuenta boolean;
  v_invitacion uuid;
begin
  select u.condominio_id, u.codigo, c.nombre into v_condominio, v_codigo, v_edificio
    from public.unidad u join public.condominio c on c.id = u.condominio_id
   where u.id = p_unidad_id and u.deleted_at is null;
  if v_condominio is null then
    raise exception 'Esa vivienda no existe';
  end if;
  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if v_correo = '' or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no sirve';
  end if;
  if v_nombre = '' then
    raise exception 'Falta el nombre del propietario';
  end if;

  v_tiene_cuenta := exists (
    select 1 from auth.users where lower(email) = v_correo and email_confirmed_at is not null
  );

  -- Lo pendiente para esa vivienda y ese correo deja de valer: la nueva lo
  -- reemplaza.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where unidad_id = p_unidad_id and ambito = 'unidad' and rol_unidad = 'propietario'
     and lower(correo) = v_correo and estado = 'pendiente';

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, correo, nombre,
    token_hash, invitada_por, expira_en
  ) values (
    v_condominio, 'unidad', p_unidad_id, 'propietario', v_correo, v_nombre,
    encode(extensions.digest(encode(extensions.gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
    auth.uid(), now() + interval '1 year'
  ) returning id into v_invitacion;

  -- Los espacios que la vivienda tiene ahora van con la invitación.
  insert into public.invitacion_espacio (invitacion_id, estacionamiento_id)
  select v_invitacion, e.id from public.estacionamiento e
   where e.unidad_id = p_unidad_id;
  insert into public.invitacion_espacio (invitacion_id, deposito_id)
  select v_invitacion, d.id from public.deposito d
   where d.unidad_id = p_unidad_id;

  update public.unidad set estado = 'invitado', updated_at = now()
   where id = p_unidad_id and estado = 'disponible';
  return query select v_tiene_cuenta, v_codigo, v_edificio;
end;
$function$;

-- Ya no convierte nada al entrar: la persona acepta desde Inicio.
create or replace function public.reclamar_asignaciones()
 returns integer
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
  select count(*)::int
  from public.invitacion i
  join auth.users u on u.id = auth.uid() and u.email_confirmed_at is not null
  where lower(i.correo) = lower(u.email) and i.estado = 'pendiente'
    and i.ambito = 'unidad' and i.rol_unidad = 'propietario' and i.expira_en > now();
$function$;

create or replace function public.mis_invitaciones_pendientes()
 returns table(
   invitacion_id uuid, unidad text, torre integer, edificio text, invitada_por text,
   terminos text, espacios jsonb
 )
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
  select i.id, u.codigo, t.numero::int, c.nombre,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         (select cp.valor from public.configuracion_plataforma cp where cp.clave = 'terminos_propiedad'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', ie.id,
                    'estado', ie.estado,
                    'tipo', case when ie.estacionamiento_id is not null then 'estacionamiento' else 'deposito' end,
                    'codigo', coalesce(e.codigo, d.codigo),
                    'ubicacion', coalesce(e.ubicacion, d.ubicacion),
                    'terminos', (select cp.valor from public.configuracion_plataforma cp
                                  where cp.clave = case when ie.estacionamiento_id is not null
                                                        then 'terminos_estacionamiento'
                                                        else 'terminos_deposito' end)
                  ) order by ie.created_at)
             from public.invitacion_espacio ie
             left join public.estacionamiento e on e.id = ie.estacionamiento_id
             left join public.deposito d on d.id = ie.deposito_id
            where ie.invitacion_id = i.id
         ), '[]'::jsonb)
  from public.invitacion i
  join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
  join public.unidad u on u.id = i.unidad_id and u.deleted_at is null
  join public.torre t on t.id = u.torre_id
  join public.condominio c on c.id = i.condominio_id
  left join public.perfil p on p.id = i.invitada_por
  where lower(i.correo) = lower(yo.email)
    and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
    and i.expira_en > now()
    and (
      i.estado = 'pendiente'
      -- Aceptada pero con espacios por resolver: sigue saliendo.
      or (i.estado = 'aceptada' and i.aceptada_por = auth.uid() and exists (
            select 1 from public.invitacion_espacio ie
             where ie.invitacion_id = i.id and ie.estado = 'pendiente'))
    )
  order by i.created_at;
$function$;

create or replace function public.responder_mi_invitacion(p_invitacion_id uuid, p_acepta boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
declare
  v_inv record;
  v_correo text;
begin
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    raise exception 'Confirma tu correo antes de responder la invitación';
  end if;

  select i.* into v_inv from public.invitacion i
   where i.id = p_invitacion_id and lower(i.correo) = v_correo
     and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
     and i.estado = 'pendiente' and i.expira_en > now()
   for update;
  if v_inv.id is null then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  if not p_acepta then
    update public.invitacion set estado = 'rechazada', updated_at = now() where id = v_inv.id;
    update public.invitacion_espacio set estado = 'rechazada', resuelto_en = now()
     where invitacion_id = v_inv.id and estado = 'pendiente';
    return;
  end if;

  perform set_config('veciyo.alta_por_invitacion', 'on', true);
  if not exists (select 1 from public.membresia_unidad
                 where unidad_id = v_inv.unidad_id and usuario_id = auth.uid()
                   and rol = 'propietario' and activo) then
    insert into public.membresia_unidad (unidad_id, usuario_id, nombre, rol)
    values (v_inv.unidad_id, auth.uid(), v_inv.nombre, 'propietario');
  end if;
  perform set_config('veciyo.alta_por_invitacion', 'off', true);

  update public.unidad set estado = 'aceptado', updated_at = now()
   where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;
end;
$function$;

create or replace function public.responder_espacio_de_mi_invitacion(p_espacio_id uuid, p_acepta boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_esp record;
  v_unidad uuid;
begin
  select ie.*, i.unidad_id as la_unidad into v_esp
    from public.invitacion_espacio ie
    join public.invitacion i on i.id = ie.invitacion_id
   where ie.id = p_espacio_id and ie.estado = 'pendiente'
     and i.estado = 'aceptada' and i.aceptada_por = auth.uid()
   for update of ie;
  if v_esp.id is null then
    raise exception 'Ese espacio ya no está pendiente';
  end if;
  v_unidad := v_esp.la_unidad;

  update public.invitacion_espacio
     set estado = case when p_acepta then 'aceptada'::public.estado_invitacion
                       else 'rechazada'::public.estado_invitacion end,
         resuelto_en = now()
   where id = v_esp.id;

  -- Lo que no acepta se suelta de la vivienda.
  if not p_acepta then
    if v_esp.estacionamiento_id is not null then
      update public.estacionamiento set unidad_id = null, updated_at = now()
       where id = v_esp.estacionamiento_id and unidad_id = v_unidad;
    else
      update public.deposito set unidad_id = null, updated_at = now()
       where id = v_esp.deposito_id and unidad_id = v_unidad;
    end if;
  end if;
end;
$function$;

comment on function public.mis_invitaciones_pendientes() is
  'Las invitaciones de propietario de quien pregunta (por su correo confirmado), con sus términos y sus estacionamientos y depósitos (30/10/2026).';
comment on function public.responder_mi_invitacion(uuid, boolean) is
  'Acepta o rechaza la invitación a una vivienda. Al aceptar queda propietario; los espacios se responden aparte (30/10/2026).';
comment on function public.responder_espacio_de_mi_invitacion(uuid, boolean) is
  'Acepta o rechaza un estacionamiento o depósito de la invitación. Si lo rechaza, se suelta de la vivienda (30/10/2026).';

revoke execute on function public.mis_invitaciones_pendientes() from public, anon;
revoke execute on function public.responder_mi_invitacion(uuid, boolean) from public, anon;
revoke execute on function public.responder_espacio_de_mi_invitacion(uuid, boolean) from public, anon;
grant execute on function public.mis_invitaciones_pendientes() to authenticated, service_role;
grant execute on function public.responder_mi_invitacion(uuid, boolean) to authenticated, service_role;
grant execute on function public.responder_espacio_de_mi_invitacion(uuid, boolean) to authenticated, service_role;
