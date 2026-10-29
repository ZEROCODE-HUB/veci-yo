-- El anfitrión primario, cuando la renta corta ya se dio de baja (29/10/2026).
--
-- El cliente: un propietario dio de baja la renta corta y seguía marcado como
-- anfitrión primario, sin poder quitárselo ni declararse residente. La regla
-- «el anfitrión no vive en la vivienda» (20261029140000) solo tiene sentido
-- mientras la vivienda se alquila por noches. Solo aditiva.

-- La vivienda se alquila por noches ahora: renta corta activa y sin baja pedida.
create or replace function public.renta_corta_en_marcha(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.suscripcion_renta_corta s
     where s.unidad_id = p_unidad_id and s.estado = 'activa' and s.cancelada_en is null
  );
$$;
comment on function public.renta_corta_en_marcha(uuid) is
  'Si la vivienda tiene la renta corta activa y sin baja pedida. Con la baja pedida o vencida, el anfitrión primario deja de impedir ser residente y se puede quitar.';
revoke execute on function public.renta_corta_en_marcha(uuid) from public, anon;
grant execute on function public.renta_corta_en_marcha(uuid) to authenticated, service_role;

create or replace function public.anfitrion_no_es_residente()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Solo mientras la vivienda se alquila por noches.
  if coalesce(new.es_anfitrion_primario, false) and public.renta_corta_en_marcha(new.unidad_id) then
    if tg_op = 'UPDATE' and new.es_residente and not old.es_residente
       and old.es_anfitrion_primario then
      raise exception 'El anfitrión primario no vive en la vivienda: no puede ser residente mientras la renta corta esté activa';
    end if;
    new.es_residente := false;
  end if;
  return new;
end;
$$;
comment on function public.anfitrion_no_es_residente() is
  'Mientras la renta corta está activa y sin baja, el anfitrión primario no es residente (29/10/2026). Sin renta corta en marcha no se aplica.';

/*
  Quitar la marca de anfitrión primario. Lo puede quien gestiona la vivienda o
  la propia persona, y solo si la renta corta no está en marcha: mientras se
  alquila por noches la vivienda necesita un anfitrión (se cambia marcando a
  otro).
*/
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
  if public.renta_corta_en_marcha(v_unidad) then
    raise exception 'Mientras la renta corta esté activa la vivienda necesita un anfitrión primario. Para cambiarlo, marca a otra persona, o da de baja la renta corta.';
  end if;

  perform set_config('veciyo.designando_primario', 'on', true);
  update public.membresia_unidad set es_anfitrion_primario = false where id = p_membresia_id;
  perform set_config('veciyo.designando_primario', 'off', true);
end;
$$;
comment on function public.quitar_anfitrion_primario(uuid) is
  'Quita la marca de anfitrión primario cuando la vivienda ya no se alquila por noches (29/10/2026).';
revoke execute on function public.quitar_anfitrion_primario(uuid) from public, anon;
grant execute on function public.quitar_anfitrion_primario(uuid) to authenticated, service_role;
