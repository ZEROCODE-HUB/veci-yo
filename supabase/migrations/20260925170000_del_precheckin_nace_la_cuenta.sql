-- Del precheckin nace la cuenta: se cierra el circulo de R-26.
--
-- Hasta aqui la estancia (una `visita` con sus `invitado`) y la cuenta (una
-- `membresia_unidad` nacida de una invitacion por correo) eran dos cosas
-- paralelas que no se conocian. El resultado era que **la persona reportada a
-- la autoridad y la persona que tiene las llaves podian ser distintas**: en la
-- 102, Carlos Rojas estaba reportado y no tenia acceso, y Tomas tenia acceso y
-- no estaba reportado.
--
-- Aqui dejan de ser paralelas: la cuenta se emite **desde** el precheckin, con
-- las fechas de la estancia, y queda apuntando a la persona concreta que hizo
-- el registro.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

-- 1. El hilo entre la invitacion y la persona ---------------------------------

alter table public.invitacion
  add column if not exists invitado_id uuid
    references public.invitado(id) on delete set null;

comment on column public.invitacion.invitado_id is
  'De que huesped concreto salio esta invitacion. Explicito y no casando por correo: dos estancias seguidas de la misma persona son dos filas distintas, y casar por correo las confundiria.';

-- 2. La verificacion, separada de quien la pide -------------------------------

-- `verificar_antecedentes` mezclaba dos cosas: comprobar que quien la pide es
-- el anfitrion, y decidir de que bolsa se descuenta. La segunda tiene que
-- poder correr tambien desde el precheckin, donde no hay sesion de nadie.
--
-- Se parte en dos en vez de copiarse: dos sitios calculando el mismo consumo
-- con criterios distintos es el defecto que mas veces ha salido en este
-- proyecto, y aqui significaria cobrar dos veces o ninguna.
create or replace function public.anotar_verificacion(
  p_invitado_id uuid,
  p_proveedor   text default null,
  p_referencia  text default null,
  p_resultado   resultado_verificacion default 'aprobada',
  p_respuesta   jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_unidad   uuid;
  v_base     int;
  v_usadas_b int;
  v_paq      int;
  v_usadas_p int;
  v_origen   public.origen_verificacion;
  v_paquete  uuid;
  v_periodo  uuid;
  v_id       uuid;
begin
  select v.unidad_id into v_unidad
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  if v_unidad is null then
    raise exception 'Ese huesped no existe';
  end if;

  if exists (select 1 from public.verificacion_antecedentes va
             where va.invitado_id = p_invitado_id
               and va.resultado <> 'error_proveedor') then
    raise exception 'Ese huesped ya tiene una verificacion'
      using errcode = 'unique_violation';
  end if;

  select incluidas, suscritas_usadas, suplementarias, suplementarias_usadas
    into v_base, v_usadas_b, v_paq, v_usadas_p
  from public.consumo_verificaciones(v_unidad);

  if v_base is null then
    raise exception 'Esta vivienda no tiene suscripcion de renta corta';
  end if;

  if coalesce(v_usadas_b, 0) < coalesce(v_base, 0) then
    v_origen := 'paquete_base';
    select ps.id into v_periodo
    from public.periodo_suscripcion ps
    join public.suscripcion_renta_corta s on s.id = ps.suscripcion_id
    where s.unidad_id = v_unidad
    order by ps.desde desc limit 1;

    if v_periodo is null then
      raise exception 'Esta suscripcion no tiene ningun periodo abierto: no hay de donde descontar la verificacion'
        using errcode = 'check_violation';
    end if;
  elsif coalesce(v_usadas_p, 0) < coalesce(v_paq, 0) then
    v_origen := 'paquete_complementario';
    select p.id into v_paquete
    from public.paquete_verificaciones p
    where p.unidad_id = v_unidad
      and (p.vence_en is null or p.vence_en >= current_date)
    order by p.vence_en nulls last limit 1;
  else
    raise exception 'No quedan verificaciones disponibles. Compra un paquete.'
      using errcode = 'check_violation';
  end if;

  insert into public.verificacion_antecedentes (
    invitado_id, unidad_id, origen, periodo_id, paquete_id,
    proveedor, resultado, referencia_externa, respuesta, ejecutada_en
  )
  values (
    p_invitado_id, v_unidad, v_origen, v_periodo, v_paquete,
    coalesce(nullif(btrim(coalesce(p_proveedor, '')), ''), 'simulado'),
    p_resultado, p_referencia, p_respuesta, now()
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

comment on function public.anotar_verificacion is
  'Descuenta y anota la verificacion, SIN mirar quien la pide. No se llama directo desde la app: para eso esta `verificar_antecedentes`, que ademas comprueba el permiso.';

-- `verificar_antecedentes` conserva su firma y su contrato --sigue siendo la
-- que llama la app, y sigue exigiendo ser el anfitrion--, pero ya no repite el
-- calculo del consumo.
create or replace function public.verificar_antecedentes(
  p_invitado_id uuid,
  p_proveedor   text default null,
  p_referencia  text default null,
  p_resultado   resultado_verificacion default 'aprobada',
  p_respuesta   jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  -- Es del anfitrion: el KT dice que corre sin intervencion del huesped y sin
  -- visibilidad para el.
  if not public.es_anfitrion_del_invitado(p_invitado_id) then
    raise exception 'Solo el anfitrion del alojamiento puede pedir la verificacion';
  end if;

  return public.anotar_verificacion(
    p_invitado_id, p_proveedor, p_referencia, p_resultado, p_respuesta);
end;
$fn$;

revoke execute on function public.anotar_verificacion(
  uuid, text, text, resultado_verificacion, jsonb) from anon, authenticated;

-- 3. Cerrar el precheckin -----------------------------------------------------

create or replace function public.cerrar_precheckin(p_token text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $fn$
declare
  v_visita    public.visita%rowtype;
  v_titular   public.invitado%rowtype;
  v_anfitrion uuid;
  v_token     text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now()
  for update;

  if v_visita.id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  -- Cerrar dos veces no emite dos accesos. Volver atras en el navegador o
  -- pulsar dos veces el boton es lo normal, no una excepcion.
  if v_visita.precheckin_completado_en is not null then
    raise exception 'Este preregistro ya estaba cerrado';
  end if;

  select * into v_titular
  from public.invitado where visita_id = v_visita.id and es_titular;

  if v_titular.id is null
     or coalesce(btrim(v_titular.documento_numero), '') = ''
     or coalesce(btrim(v_titular.correo), '') = '' then
    raise exception 'Faltan tus datos: el documento y el correo son obligatorios';
  end if;

  if not v_titular.terminos_aceptados then
    raise exception 'Hace falta aceptar los terminos y condiciones';
  end if;

  -- Quien figura como emisor del acceso. Es el propietario de la vivienda: el
  -- huesped no puede invitarse a si mismo, aunque sea su mano la que pulsa.
  select m.usuario_id into v_anfitrion
  from public.membresia_unidad m
  where m.unidad_id = v_visita.unidad_id
    and m.rol = 'propietario' and m.activo
  order by m.created_at limit 1;

  if v_anfitrion is null then
    raise exception 'Esta vivienda no tiene un propietario registrado';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta, invitado_id
  ) values (
    v_visita.condominio_id, 'unidad', v_visita.unidad_id, 'huesped_temporal',
    lower(btrim(v_titular.correo)),
    btrim(v_titular.nombre || ' ' || coalesce(v_titular.apellidos, '')),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_anfitrion,
    -- Vence con la estancia, no a los siete dias: un acceso que sobrevive a
    -- la salida del huesped es una llave que se queda fuera.
    coalesce(v_visita.fecha_hasta + 1, current_date + 30)::timestamptz,
    v_visita.fecha_desde, v_visita.fecha_hasta, v_titular.id
  );

  update public.visita
  set precheckin_completado_en = now()
  where id = v_visita.id;

  update public.invitado
  set precheckin_completado_en = now()
  where id = v_titular.id;

  -- La verificacion de antecedentes corre aqui: el KT dice que es automatica
  -- en este paso, sin intervencion del anfitrion ni visibilidad para el
  -- huesped.
  --
  -- Si no se puede --la vivienda no tiene suscripcion, o se acabaron las
  -- verificaciones-- NO se bloquea el cierre. Que un huesped no pueda terminar
  -- su registro porque su anfitrion no renovo un plan seria castigar a quien
  -- no decide. El paso queda pendiente y el anfitrion lo ve en su pantalla,
  -- que es quien puede hacer algo al respecto.
  begin
    perform public.anotar_verificacion(v_titular.id);
  exception when others then
    null;
  end;

  return v_token;
end;
$fn$;

comment on function public.cerrar_precheckin(text) is
  'Cierra el preregistro y emite el acceso del titular a la aplicacion, con las fechas de la estancia. Devuelve el token de esa invitacion UNA vez.';

grant execute on function public.cerrar_precheckin(text) to anon, authenticated;

-- 4. Y al aceptarla, la cuenta queda apuntando a la persona -------------------

-- `aceptar_invitacion` crea la membresia. Le falta cerrar el circulo: dejar
-- dicho que esa cuenta es la de ESTE huesped de ESTA estancia. Sin eso, un
-- huesped no puede saber quien se aloja con el, que es de donde salio todo
-- esto (R-25: los acompanantes no entraban al edificio por ningun sitio).
create or replace function public.enlazar_cuenta_con_estancia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.estado = 'aceptada' and old.estado is distinct from 'aceptada'
     and new.invitado_id is not null then
    update public.invitado
    set usuario_id = new.aceptada_por
    where id = new.invitado_id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists invitacion_enlaza_cuenta on public.invitacion;
create trigger invitacion_enlaza_cuenta
  after update on public.invitacion
  for each row execute function public.enlazar_cuenta_con_estancia();

comment on function public.enlazar_cuenta_con_estancia() is
  'Al aceptar la invitacion, la cuenta queda apuntando al invitado del que salio. Es un disparador y no una linea dentro de `aceptar_invitacion` para que valga tambien si la invitacion se acepta por otro camino.';
