-- ----------------------------------------------------------------------------
-- Nombrar propietario es de la administracion, tambien en la base
-- ----------------------------------------------------------------------------
-- KT flujo 4.3, `[DECIDIDO]`:
--
--   "Solo puede crear 3 tipos: Inquilino Lider, Coadministrador, Residente. No
--    puede crear Huesped Temporal (va por otro flujo) ni Propietario (lo crea
--    el Administrador del edificio)."
--
-- R-87 lo arreglo en la pantalla: la lista de roles que ofrece el formulario
-- depende de quien invita. Pero la regla solo vivia ahi.
--
-- Y hay una razon concreta por la que eso importa mas de lo normal:
-- `proteger_membresia_unidad` (R-64) impide que nadie salvo la administracion
-- registre a un propietario... salvo cuando el alta viene de aceptar una
-- invitacion, que activa `veciyo.alta_por_invitacion` para dejarla pasar. O
-- sea que **la invitacion era el camino para saltarse esa proteccion**: un
-- propietario invitaba a otra persona como propietaria de su vivienda, y al
-- aceptar el disparador la dejaba entrar.
--
-- Salio de escribir la primera prueba del onboarding.

create or replace function public.crear_invitacion(
  p_condominio_id  uuid,
  p_ambito         public.ambito_invitacion,
  p_correo         text,
  p_nombre         text,
  p_unidad_id      uuid DEFAULT NULL,
  p_rol_unidad     public.rol_unidad DEFAULT NULL,
  p_rol_condominio public.rol_condominio DEFAULT NULL,
  p_vigente_desde  date DEFAULT NULL,
  p_vigente_hasta  date DEFAULT NULL
)
returns table (invitacion_id uuid, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;

    -- La propiedad de una vivienda es un hecho legal que registra la
    -- administracion: quien gestiona la vivienda da de alta a los suyos, no a
    -- su dueño.
    --
    -- El huesped temporal NO entra aqui, aunque la misma frase del KT lo
    -- nombre. Lo que dice es que "va por otro flujo" —el precheckin—, no que
    -- solo la administracion pueda darlo de alta; y ese flujo todavia no
    -- existe (R-90). Restringirlo dejaria al anfitrion sin ninguna forma de
    -- recibir a su huesped, que es el producto entero. Lo detecto una prueba
    -- anterior al intentarlo.
    if p_rol_unidad = 'propietario'
       and not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;
  end if;

  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La estancia termina antes de hoy';
  end if;

  if p_vigente_desde is not null and p_vigente_hasta is not null
     and p_vigente_desde > p_vigente_hasta then
    raise exception 'La estancia termina antes de empezar';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days',
    p_vigente_desde, p_vigente_hasta
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$$;

comment on function public.crear_invitacion is
  'Emite una invitacion. Al propietario solo lo invita la administracion (KT flujo 4.3): la invitacion era el camino para saltarse la proteccion de membresia_unidad.';
