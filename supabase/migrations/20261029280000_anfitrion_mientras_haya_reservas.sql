-- El anfitrión primario se queda mientras la vivienda tenga huéspedes
-- (29/10/2026, D-70). Antes bastaba con dar de baja la renta corta para
-- quitárselo, y una vivienda con una reserva pendiente se quedaba sin nadie
-- que recibiera al huésped. Ahora se quita solo cuando ya no se alquila
-- (vivienda_en_alquiler: renta en marcha o reservas pendientes). Solo aditiva.
create or replace function public.quitar_anfitrion_primario(p_membresia_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_unidad  uuid;
  v_usuario uuid;
begin
  select mu.unidad_id, mu.usuario_id into v_unidad, v_usuario
    from public.membresia_unidad mu
   where mu.id = p_membresia_id and mu.activo;
  if v_unidad is null then
    raise exception 'Esa persona no esta activa en ninguna vivienda';
  end if;
  if not (public.puede_invitar_a_unidad(v_unidad) or v_usuario = auth.uid()) then
    raise exception 'No puedes cambiar quien es el anfitrion de esta vivienda';
  end if;
  if public.vivienda_en_alquiler(v_unidad) then
    raise exception 'Mientras la vivienda se alquila o le quedan reservas necesita un anfitrión primario. Para cambiarlo, marca a otra persona.';
  end if;

  perform set_config('veciyo.designando_primario', 'on', true);
  update public.membresia_unidad set es_anfitrion_primario = false where id = p_membresia_id;
  perform set_config('veciyo.designando_primario', 'off', true);
end;
$$;

-- Xander (101): le queda una reserva hasta el 31/10, así que vuelve a ser el
-- anfitrión primario.
update public.membresia_unidad mu set es_anfitrion_primario = true
  from public.unidad u
 where u.id = mu.unidad_id and u.codigo = '101' and u.deleted_at is null
   and mu.usuario_id = 'ddc29958-a1b3-4a2a-8f4c-6a37cf9c75ff' and mu.rol = 'propietario'
   and mu.activo and public.vivienda_en_alquiler(mu.unidad_id)
   and not exists (select 1 from public.membresia_unidad o
                    where o.unidad_id = mu.unidad_id and o.activo and o.es_anfitrion_primario);
