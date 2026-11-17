-- Con inquilino líder, el propietario no vuelve a ser residente (17/11/2026).
--
-- `20261117120201` marca al propietario como no residente cuando un inquilino
-- líder queda activo en la vivienda, y le decía «si vives ahí, cámbialo en
-- Configuración». Decisión del cliente: mientras haya un inquilino líder
-- activo, el propietario NO puede volver a marcarse residente. Para volver a
-- vivir ahí, primero se quita al inquilino líder.
--
-- La pantalla ya no le ofrece el interruptor, pero el límite es la base:
--   · un propietario activo que pasa de no residente a residente con un
--     inquilino líder activo en la vivienda → error con el motivo;
--   · un propietario que entra (alta, reactivación o cambio de rol) con
--     inquilino líder activo entra como no residente, sin error: es el mismo
--     trato que da `no_se_vive_donde_se_alquila` a la renta corta.
-- Quien es a la vez propietario e inquilino líder de esa vivienda no cuenta
-- (no se bloquea a sí mismo), igual que en el disparador del 120201.
--
-- Solo aditiva: funciones con `create or replace` y un disparador nuevo. El
-- aviso del 120201 cambia solo su texto.

-- ─── 1. ¿Hay inquilino líder activo, que no sea esta persona? ──────────────

create or replace function public.hay_inquilino_lider_activo(p_unidad_id uuid, p_salvo uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad il
     where il.unidad_id = p_unidad_id
       and il.rol = 'inquilino_lider'
       and il.activo
       and (p_salvo is null or il.usuario_id is distinct from p_salvo)
  );
$$;

comment on function public.hay_inquilino_lider_activo(uuid, uuid) is
  'Si la vivienda tiene un inquilino líder activo (sin contar a p_salvo). Interna: la usa el disparador propietario_no_reside_mientras_haya_inquilino_lider.';

revoke all on function public.hay_inquilino_lider_activo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.hay_inquilino_lider_activo(uuid, uuid) to service_role;

-- ─── 2. El disparador ────────────────────────────────────────────────────────

create or replace function public.propietario_no_reside_mientras_haya_inquilino_lider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.rol <> 'propietario' or not coalesce(new.activo, false) or not coalesce(new.es_residente, false) then
    return new;
  end if;
  if not public.hay_inquilino_lider_activo(new.unidad_id, new.usuario_id) then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.rol = 'propietario' and coalesce(old.activo, false) then
    if not coalesce(old.es_residente, false) then
      raise exception 'Para volver a vivir aquí, primero quita al inquilino líder.';
    end if;
    -- Ya era residente (de antes de esta regla): no se le toca aquí.
    return new;
  end if;

  -- Alta, reactivación o cambio de rol: entra como no residente.
  new.es_residente := false;
  return new;
end;
$$;

comment on function public.propietario_no_reside_mientras_haya_inquilino_lider() is
  'Disparador (17/11/2026): mientras haya un inquilino líder activo en la vivienda, el propietario no puede volver a ser residente. Interna.';

revoke all on function public.propietario_no_reside_mientras_haya_inquilino_lider() from public, anon, authenticated;
grant execute on function public.propietario_no_reside_mientras_haya_inquilino_lider() to service_role;

drop trigger if exists membresia_unidad_propietario_no_reside_con_inquilino on public.membresia_unidad;
create trigger membresia_unidad_propietario_no_reside_con_inquilino
  before insert or update of es_residente, rol, activo on public.membresia_unidad
  for each row execute function public.propietario_no_reside_mientras_haya_inquilino_lider();

-- ─── 3. El aviso ya no dice «cámbialo en Configuración» ─────────────────────

create or replace function public.propietario_no_reside_con_inquilino_lider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quien     text;
  v_vivienda  text;
  v_condominio uuid;
  v_dueno     uuid;
begin
  if new.rol <> 'inquilino_lider' or not coalesce(new.activo, false) then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.activo, false) and old.rol = 'inquilino_lider' then
    return new;
  end if;

  select coalesce(nullif(btrim(concat_ws(' ', pf.nombre, pf.apellido)), ''), nullif(btrim(new.nombre), ''), 'Alguien')
    into v_quien
    from (select 1) x
    left join public.perfil pf on pf.id = new.usuario_id;

  select u.condominio_id,
         concat_ws(' · ', coalesce(nullif(btrim(t.nombre), ''), 'Torre ' || t.numero), 'Depto ' || u.codigo)
    into v_condominio, v_vivienda
    from public.unidad u
    left join public.torre t on t.id = u.torre_id
   where u.id = new.unidad_id;

  for v_dueno in
    update public.membresia_unidad m
       set es_residente = false
     where m.unidad_id = new.unidad_id
       and m.rol = 'propietario'
       and m.activo
       and m.es_residente
       and m.usuario_id is distinct from new.usuario_id
    returning m.usuario_id
  loop
    if v_dueno is not null and public.quiere_aviso(v_dueno, 'residencia_cambiada', 'app') then
      insert into public.notificacion
        (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
      values (
        v_dueno, v_condominio, 'residencia_cambiada',
        'Ahora figuras como no residente',
        format('%s es ahora inquilino líder de %s. Te marcamos como no residente; para volver a vivir ahí, primero quita al inquilino líder.',
               v_quien, v_vivienda),
        'unidad', new.unidad_id
      );
    end if;
  end loop;

  return new;
end;
$$;
