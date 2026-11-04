-- El huésped temporal ve su invitación al entrar a la app (Para Claude 224, 04/11/2026).
--
-- Quien terminaba el preregistro e iniciaba sesión (o creaba su cuenta) en la
-- app encontraba la app vacía: la invitación solo se podía aceptar abriendo el
-- enlace con el token, y la web ya no lo manda ahí sino al inicio de sesión
-- normal (Para Claude 223). Ahora la app le pregunta a la base por las
-- invitaciones de huésped pendientes de **su correo confirmado**, con los
-- datos de la reserva, y las acepta por su id. Lo mismo que ya hacían las de
-- propietario (`mis_invitaciones_pendientes`, Para Claude 183).
--
-- Solo aditivo: dos funciones nuevas; `aceptar_invitacion` (por token) sigue
-- igual.

create or replace function public.mis_invitaciones_de_huesped()
returns table (
  invitacion_id uuid,
  edificio text,
  torre integer,
  unidad text,
  anfitrion text,
  entrada date,
  salida date,
  hora_llegada time,
  hora_salida time,
  huespedes integer,
  vehiculos integer,
  codigo_reserva text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
  select i.id, c.nombre, t.numero::int, u.codigo,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         coalesce(v.fecha_desde, i.vigente_desde),
         coalesce(v.fecha_hasta, i.vigente_hasta),
         v.hora_estimada_llegada,
         v.hora_estimada_salida,
         (select count(*)::int from public.invitado g2 where g2.visita_id = v.id),
         v.vehiculos_previstos,
         v.codigo_reserva
  from public.invitacion i
  join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
  join public.condominio c on c.id = i.condominio_id
  join public.unidad u on u.id = i.unidad_id and u.deleted_at is null
  join public.torre t on t.id = u.torre_id
  left join public.invitado g on g.id = i.invitado_id
  left join public.visita v on v.id = g.visita_id and v.deleted_at is null
  left join public.perfil p on p.id = i.invitada_por
  where lower(i.correo) = lower(yo.email)
    and i.ambito = 'unidad' and i.rol_unidad = 'huesped_temporal'
    and i.estado = 'pendiente'
    and i.expira_en > now()
    and (i.vigente_hasta is null or i.vigente_hasta >= public.hoy_en_el_edificio(i.condominio_id))
    and (v.id is null or v.estado <> 'cancelada')
  order by coalesce(v.fecha_desde, i.vigente_desde), i.created_at;
$$;

comment on function public.mis_invitaciones_de_huesped() is
  'Las invitaciones de huésped temporal pendientes del correo confirmado de quien pregunta, con los datos de su reserva (Para Claude 224).';

create or replace function public.aceptar_mi_invitacion_de_huesped(p_invitacion_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
declare
  v_inv public.invitacion%rowtype;
  v_correo text;
  v_membresia_id uuid;
begin
  -- Sin token, lo que prueba que es suya es el correo confirmado.
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    raise exception 'Confirma tu correo antes de aceptar la invitación';
  end if;

  select * into v_inv from public.invitacion
   where id = p_invitacion_id and lower(correo) = v_correo
     and ambito = 'unidad' and rol_unidad = 'huesped_temporal'
   for update;
  if not found or v_inv.estado <> 'pendiente' then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  if v_inv.expira_en <= now() then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La invitación venció';
  end if;

  if v_inv.vigente_hasta is not null
     and v_inv.vigente_hasta < public.hoy_en_el_edificio(v_inv.condominio_id) then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitación ya terminó';
  end if;

  -- Lo mismo que `aceptar_invitacion` para una invitación a una vivienda.
  perform set_config('veciyo.alta_por_invitacion', 'on', true);
  insert into public.membresia_unidad (
    unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
    telefono, codigo_pais
  )
  values (
    v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
    v_inv.vigente_desde, v_inv.vigente_hasta,
    v_inv.telefono, v_inv.codigo_pais
  )
  returning id into v_membresia_id;
  perform set_config('veciyo.alta_por_invitacion', 'off', true);

  update public.unidad
     set estado = 'aceptado', updated_at = now()
   where id = v_inv.unidad_id and estado in ('disponible', 'invitado');

  -- Al pasar a «aceptada», `enlazar_cuenta_con_estancia` une la cuenta con su
  -- registro de la reserva.
  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;

  return v_membresia_id;
end;
$$;

comment on function public.aceptar_mi_invitacion_de_huesped(uuid) is
  'Acepta por su id una invitación de huésped temporal del correo confirmado de quien la acepta; igual que aceptar_invitacion pero sin token (Para Claude 224).';

revoke all on function public.mis_invitaciones_de_huesped() from public, anon;
revoke all on function public.aceptar_mi_invitacion_de_huesped(uuid) from public, anon;
grant execute on function public.mis_invitaciones_de_huesped() to authenticated;
grant execute on function public.aceptar_mi_invitacion_de_huesped(uuid) to authenticated;
