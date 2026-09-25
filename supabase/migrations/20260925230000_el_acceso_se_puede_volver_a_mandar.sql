-- El acceso del huesped se puede volver a mandar.
--
-- Lo encontro la demo del 25/09/2026, y es de los fallos que solo aparecen
-- usando la aplicacion: al cerrar el preregistro se emite el acceso del
-- huesped y se ensena UNA vez --en la base solo vive su sha256--. Si quien lo
-- ve cierra esa pantalla sin copiarlo, el enlace se pierde y **no habia
-- ninguna forma de recuperarlo**: ni el huesped podia entrar, ni el anfitrion
-- reenviarselo. Hubo que emitirlo a mano contra la base.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

create or replace function public.reemitir_acceso_huesped(p_visita_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_unidad uuid;
  v_inv    uuid;
  v_estado estado_invitacion;
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select v.unidad_id into v_unidad
  from public.visita v where v.id = p_visita_id;

  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  -- El mismo permiso que abrir el preregistro: quien gestiona la vivienda.
  if not public.puede_invitar_a_unidad(v_unidad) then
    raise exception 'No tenes permiso para reenviar el acceso de esta estancia';
  end if;

  select i.id, i.estado into v_inv, v_estado
  from public.invitacion i
  join public.invitado inv on inv.id = i.invitado_id
  where inv.visita_id = p_visita_id and inv.es_titular;

  if v_inv is null then
    raise exception 'Esta estancia todavia no tiene un acceso emitido: el huesped no ha cerrado su preregistro';
  end if;

  -- Ya la acepto: tiene cuenta, y reenviarle un enlace de alta no le sirve de
  -- nada. Decirlo es mas util que darle un enlace que va a fallar.
  if v_estado = 'aceptada' then
    raise exception 'Tu huesped ya creo su cuenta con este acceso';
  end if;

  -- Se reemite sobre la invitacion que YA existe, no se crea otra: dos
  -- invitaciones vivas para una estancia son dos llaves, y la segunda dejaria
  -- la primera en pie.
  update public.invitacion
  set token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      estado = 'pendiente',
      updated_at = now()
  where id = v_inv;

  return v_token;
end;
$fn$;

comment on function public.reemitir_acceso_huesped(uuid) is
  'Vuelve a emitir el enlace de acceso del titular sobre la invitacion que ya existe. El anterior deja de valer. Devuelve el token en claro UNA vez, como todos los demas.';

grant execute on function public.reemitir_acceso_huesped(uuid) to authenticated;
