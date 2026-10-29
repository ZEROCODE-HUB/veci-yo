-- Una vivienda o es para vivir o es para alquilar por noches (29/10/2026).
--
-- Decidido con el cliente (D-70 del GSheet):
--   1. La renta corta solo la activa un propietario que no vive en la
--      vivienda: al activarla confirma «no vivo aquí» y queda como anfitrión
--      primario. No puede haber nadie que viva en ella: ni otro propietario
--      residente, ni inquilino líder, ni residentes. El inquilino líder vive
--      en la vivienda, así que tampoco puede alquilarla (cambia el KT, que lo
--      permitía).
--   2. Mientras se alquila por noches --renta corta en marcha o reservas de
--      huéspedes pendientes-- nadie se declara residente ni se da de alta como
--      inquilino líder o residente.
--   3. Para volver a vivir ahí, se da de baja la renta corta: desde la baja no
--      se aceptan reservas nuevas, y cuando terminan las que había ya se puede
--      ser residente.
-- Reemplaza a la regla de la mañana (anfitrión primario no residente), que
-- queda contenida en esta. Solo aditiva: no se toca ningún dato.

-- Se alquila por noches ahora: renta corta en marcha, o le quedan huéspedes.
create or replace function public.vivienda_en_alquiler(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.renta_corta_en_marcha(p_unidad_id)
      or exists (
        select 1 from public.visita v
         where v.unidad_id = p_unidad_id
           and v.tipo = 'huesped_temporal'
           and v.deleted_at is null
           and v.estado in ('programada', 'ingresada')
           and coalesce(v.fecha_hasta, v.fecha_desde) >= public.hoy_en_la_unidad(p_unidad_id)
      );
$$;
comment on function public.vivienda_en_alquiler(uuid) is
  'Si la vivienda se alquila por noches ahora: renta corta activa y sin baja, o con reservas de huéspedes que no han terminado. Mientras tanto nadie vive en ella (29/10/2026).';
revoke execute on function public.vivienda_en_alquiler(uuid) from public, anon;
grant execute on function public.vivienda_en_alquiler(uuid) to authenticated, service_role;

-- Quién figura como que vive en la vivienda.
create or replace function public.vive_alguien_en(p_unidad_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select string_agg(mu.nombre, ', ' order by mu.nombre)
    from public.membresia_unidad mu
   where mu.unidad_id = p_unidad_id
     and mu.activo
     and mu.rol not in ('huesped_temporal', 'coadministrador')
     and (mu.es_residente or mu.rol in ('inquilino_lider', 'residente', 'corresidente'));
$$;
revoke execute on function public.vive_alguien_en(uuid) from public, anon;
grant execute on function public.vive_alguien_en(uuid) to authenticated, service_role;

-- 2. Mientras se alquila, nadie pasa a vivir ahí.
create or replace function public.no_se_vive_donde_se_alquila()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not coalesce(new.activo, false) or new.rol in ('huesped_temporal', 'coadministrador') then
    return new;
  end if;
  if not public.vivienda_en_alquiler(new.unidad_id) then
    return new;
  end if;

  if new.rol in ('inquilino_lider', 'residente', 'corresidente') then
    if tg_op = 'INSERT' or old.rol is distinct from new.rol or not coalesce(old.activo, false) then
      raise exception 'Esta vivienda se alquila por noches: no puede tener inquilino líder ni residentes. Primero se da de baja la renta corta y terminan sus reservas.';
    end if;
    return new;
  end if;

  if new.rol = 'propietario' and new.es_residente then
    if tg_op = 'INSERT' then
      -- Un propietario que se registra en una vivienda alquilada no vive en ella.
      new.es_residente := false;
    elsif not coalesce(old.es_residente, false) then
      raise exception 'Mientras la vivienda se alquila por noches no puedes ser residente. Da de baja la renta corta y espera a que terminen sus reservas.';
    end if;
  end if;
  return new;
end;
$$;
comment on function public.no_se_vive_donde_se_alquila() is
  'Mientras la vivienda se alquila por noches (vivienda_en_alquiler), nadie se declara residente ni se da de alta como inquilino líder o residente (29/10/2026).';
drop trigger if exists membresia_unidad_no_se_vive_donde_se_alquila on public.membresia_unidad;
create trigger membresia_unidad_no_se_vive_donde_se_alquila
  before insert or update of es_residente, rol, activo on public.membresia_unidad
  for each row execute function public.no_se_vive_donde_se_alquila();

-- 1. Para activar, nadie puede vivir en ella.
create or replace function public.alquilar_solo_si_nadie_vive()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_quien text;
begin
  -- Solo al quedar en marcha (activa y sin baja) desde no estarlo.
  if not (new.estado = 'activa' and new.cancelada_en is null) then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.estado = 'activa' and old.cancelada_en is null then
    return new;
  end if;
  v_quien := public.vive_alguien_en(new.unidad_id);
  if v_quien is not null then
    raise exception 'Para alquilar por noches nadie puede vivir en la vivienda, y figura como que vive en ella: %. El propietario se declara no residente y no puede haber inquilino líder ni residentes.', v_quien;
  end if;
  return new;
end;
$$;
drop trigger if exists suscripcion_renta_corta_nadie_vive on public.suscripcion_renta_corta;
create trigger suscripcion_renta_corta_nadie_vive
  before insert or update of estado, cancelada_en on public.suscripcion_renta_corta
  for each row execute function public.alquilar_solo_si_nadie_vive();

-- La activa el propietario (o la administración), no el inquilino líder.
create or replace function public.activar_suscripcion_renta_corta(p_unidad_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if not (
    exists (select 1 from public.membresia_unidad mu
             where mu.unidad_id = p_unidad_id and mu.usuario_id = auth.uid()
               and mu.activo and mu.rol = 'propietario')
    or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id))
  ) then
    raise exception 'La renta corta solo la activa el propietario de la vivienda (y no puede vivir en ella)'
      using errcode = '42501';
  end if;

  insert into public.suscripcion_renta_corta (unidad_id, estado, cancelada_en)
  values (p_unidad_id, 'activa', null)
  on conflict (unidad_id) do update
    set estado = 'activa', cancelada_en = null;
end;
$function$;

-- El propietario confirma «no vivo aquí» antes de pagar: deja de ser residente
-- y queda como anfitrión primario.
create or replace function public.preparar_para_alquilar(p_unidad_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_yo uuid;
  v_quien text;
begin
  select mu.id into v_yo from public.membresia_unidad mu
   where mu.unidad_id = p_unidad_id and mu.usuario_id = auth.uid()
     and mu.activo and mu.rol = 'propietario';
  if v_yo is null then
    raise exception 'La renta corta solo la activa el propietario de la vivienda';
  end if;

  perform set_config('veciyo.designando_primario', 'on', true);
  update public.membresia_unidad set es_residente = false where id = v_yo;
  update public.membresia_unidad set es_anfitrion_primario = false
   where unidad_id = p_unidad_id and es_anfitrion_primario and activo and id <> v_yo;
  update public.membresia_unidad set es_anfitrion_primario = true where id = v_yo;
  perform set_config('veciyo.designando_primario', 'off', true);

  v_quien := public.vive_alguien_en(p_unidad_id);
  if v_quien is not null then
    raise exception 'Todavía figura como que vive en la vivienda: %. Para alquilar por noches no puede haber inquilino líder ni residentes.', v_quien;
  end if;
end;
$$;
comment on function public.preparar_para_alquilar(uuid) is
  'El propietario confirma que no vive en la vivienda antes de activar la renta corta: deja de ser residente y queda como anfitrión primario. Falla si alguien más vive en ella (29/10/2026).';
revoke execute on function public.preparar_para_alquilar(uuid) from public, anon;
grant execute on function public.preparar_para_alquilar(uuid) to authenticated, service_role;

-- 3. Con la baja pedida no se aceptan reservas nuevas.
create or replace function public.renta_corta_dada_de_baja(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (select 1 from public.suscripcion_renta_corta s
                  where s.unidad_id = p_unidad_id and s.cancelada_en is not null);
$$;
revoke execute on function public.renta_corta_dada_de_baja(uuid) from public, anon;
grant execute on function public.renta_corta_dada_de_baja(uuid) to authenticated, service_role;

create or replace function public.una_estancia_de_huesped_exige_renta_corta()
 returns trigger
 language plpgsql
as $function$
begin
  if new.tipo <> 'huesped_temporal' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.tipo = 'huesped_temporal'
     and old.unidad_id is not distinct from new.unidad_id then
    return new;
  end if;

  if new.unidad_id is not null and not public.autorizacion_renta_corta(new.unidad_id) then
    raise exception
      'El edificio apagó la renta corta: ya no se aceptan reservas nuevas. Las que ya tenías siguen.';
  end if;

  -- Con la baja pedida, las que había siguen y no entran nuevas (29/10/2026).
  if new.unidad_id is not null and public.renta_corta_dada_de_baja(new.unidad_id) then
    raise exception
      'Diste de baja la renta corta: ya no se aceptan reservas nuevas. Las que ya tenías siguen.';
  end if;

  if new.unidad_id is null or not public.suscripcion_vigente(new.unidad_id) then
    raise exception
      'Esta vivienda no tiene la renta corta activa. Activala para registrar huespedes temporales.';
  end if;

  return new;
end;
$function$;
