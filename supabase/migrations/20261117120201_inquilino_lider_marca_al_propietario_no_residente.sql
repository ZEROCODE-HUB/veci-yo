-- Con inquilino líder, el propietario pasa a «no residente» (17/11/2026).
--
-- El inquilino líder alquila la vivienda entera por meses: quien vive ahí es
-- él. Hasta hoy el propietario seguía marcado como residente
-- (`membresia_unidad.es_residente`, lo que declara en Configuración ›
-- Declaración de residencia) y con eso le seguían llegando los anuncios y los
-- grupos de quien vive en el edificio, y salía como residente ante los demás.
--
-- Ahora, cuando una membresía de inquilino líder queda activa en una vivienda
-- --al crearse activa, al activarse o al cambiarle el rol a inquilino líder--,
-- los propietarios activos de esa vivienda que estaban como residentes pasan
-- a no residentes, y a cada uno le llega un aviso en la app. Si de verdad vive
-- ahí, lo vuelve a cambiar en Configuración: no se le impide nada.
--
-- Solo aditiva: una función y un disparador nuevos.

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
  -- Solo cuando **empieza** a ser inquilino líder activo; un cambio de otra
  -- columna no vuelve a marcar a nadie (el propietario pudo volver a ponerse
  -- residente a propósito).
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
       -- Quien es a la vez inquilino líder y propietario no se desmarca solo.
       and m.usuario_id is distinct from new.usuario_id
    returning m.usuario_id
  loop
    if v_dueno is not null and public.quiere_aviso(v_dueno, 'residencia_cambiada', 'app') then
      insert into public.notificacion
        (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
      values (
        v_dueno, v_condominio, 'residencia_cambiada',
        'Ahora figuras como no residente',
        format('%s es ahora inquilino líder de %s. Te marcamos como no residente; si vives ahí, cámbialo en Configuración.',
               v_quien, v_vivienda),
        'unidad', new.unidad_id
      );
    end if;
  end loop;

  return new;
end;
$$;

comment on function public.propietario_no_reside_con_inquilino_lider() is
  'Disparador (17/11/2026): al quedar activo un inquilino líder, los propietarios residentes de esa vivienda pasan a no residentes y reciben un aviso. Interna.';

-- Interna: solo la llama el disparador.
revoke all on function public.propietario_no_reside_con_inquilino_lider() from public, anon, authenticated;
grant execute on function public.propietario_no_reside_con_inquilino_lider() to service_role;

drop trigger if exists membresia_unidad_inquilino_lider_propietario_no_reside on public.membresia_unidad;
create trigger membresia_unidad_inquilino_lider_propietario_no_reside
  after insert or update of activo, rol on public.membresia_unidad
  for each row execute function public.propietario_no_reside_con_inquilino_lider();
