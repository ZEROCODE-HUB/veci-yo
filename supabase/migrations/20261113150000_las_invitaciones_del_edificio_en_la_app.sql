-- Las invitaciones del edificio (guardia, coadministración, administración) se
-- ven y se aceptan en la app (13/11/2026, cliente: «me creé la cuenta con ese
-- correo, entré a la app y no me sale la invitación para aceptar el rol de
-- guardia»).
--
-- La app solo listaba las invitaciones de propietario
-- (`mis_invitaciones_pendientes`); las del edificio solo se aceptaban abriendo
-- el enlace del correo con la sesión iniciada en la web. Quien se registraba
-- en la app con ese correo no las veía nunca. Ahora:
--   · `mis_invitaciones_del_edificio()`: las pendientes y vigentes a mi correo
--     confirmado.
--   · `responder_mi_invitacion_del_edificio(id, acepta)`: la acepta (con el
--     mismo alta que `aceptar_invitacion` por enlace) o la rechaza.
-- Solo aditiva: funciones nuevas.

create or replace function public.mis_invitaciones_del_edificio()
returns table (id uuid, condominio text, rol text, invitada_por text, expira_en timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.id, c.nombre, i.rol_condominio::text,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         i.expira_en
    from public.invitacion i
    join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
    join public.condominio c on c.id = i.condominio_id
    left join public.perfil p on p.id = i.invitada_por
   where lower(i.correo) = lower(yo.email)
     and i.ambito = 'condominio'
     and i.estado = 'pendiente'
     and i.expira_en > now()
   order by i.created_at;
$$;

revoke execute on function public.mis_invitaciones_del_edificio() from public, anon;
grant execute on function public.mis_invitaciones_del_edificio() to authenticated, service_role;
comment on function public.mis_invitaciones_del_edificio() is
  'Las invitaciones del edificio (guardia, coadministración, administración) pendientes para mi correo confirmado (13/11/2026).';

create or replace function public.responder_mi_invitacion_del_edificio(p_invitacion_id uuid, p_acepta boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.invitacion%rowtype;
  v_correo text;
begin
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if v_correo is null then
    raise exception 'Confirma tu correo antes de responder la invitación';
  end if;

  select i.* into v_inv from public.invitacion i
   where i.id = p_invitacion_id and lower(i.correo) = v_correo
     and i.ambito = 'condominio' and i.estado = 'pendiente' and i.expira_en > now()
   for update;
  if v_inv.id is null then
    raise exception 'Esa invitación ya no está pendiente';
  end if;

  if not p_acepta then
    update public.invitacion set estado = 'rechazada', updated_at = now() where id = v_inv.id;
    return;
  end if;

  -- El mismo alta que `aceptar_invitacion` cuando se abre el enlace del correo.
  insert into public.membresia_condominio (
    condominio_id, usuario_id, rol, nombre, telefono, codigo_pais,
    permisos, porteria_id, documento
  )
  values (
    v_inv.condominio_id, auth.uid(), v_inv.rol_condominio,
    v_inv.nombre, v_inv.telefono, v_inv.codigo_pais,
    coalesce(v_inv.permisos, '{}'::jsonb), v_inv.porteria_id, v_inv.documento
  )
  on conflict (condominio_id, usuario_id, rol) do update set
    activo = true,
    nombre = coalesce(public.membresia_condominio.nombre, excluded.nombre),
    telefono = coalesce(public.membresia_condominio.telefono, excluded.telefono),
    codigo_pais = coalesce(public.membresia_condominio.codigo_pais, excluded.codigo_pais),
    permisos = excluded.permisos,
    porteria_id = coalesce(excluded.porteria_id, public.membresia_condominio.porteria_id),
    documento = coalesce(excluded.documento, public.membresia_condominio.documento);

  update public.invitacion
     set estado = 'aceptada', aceptada_por = auth.uid(), aceptada_en = now(), updated_at = now()
   where id = v_inv.id;
end;
$$;

revoke execute on function public.responder_mi_invitacion_del_edificio(uuid, boolean) from public, anon;
grant execute on function public.responder_mi_invitacion_del_edificio(uuid, boolean) to authenticated, service_role;
comment on function public.responder_mi_invitacion_del_edificio(uuid, boolean) is
  'Acepta o rechaza, desde la app, una invitación del edificio dirigida a mi correo confirmado (13/11/2026).';
