-- El saldo de verificaciones no depende de quien mira.
--
-- `consumo_verificaciones` hace dos cosas en la misma consulta: calcula
-- cuantas verificaciones quedan Y filtra por `puede_operar_unidad`, que mira
-- `auth.uid()`. Para la pantalla del anfitrion esta bien. Para el precheckin
-- no: alli no hay sesion de nadie, asi que devolvia **cero filas** y
-- `anotar_verificacion` lo leia como "esta vivienda no tiene suscripcion".
--
-- El sintoma era peor que el fallo: la verificacion no corria y el paso del
-- timeline se quedaba en gris sin que nadie supiera por que, porque el cierre
-- se tragaba la excepcion en silencio. Se arregla lo uno y lo otro.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

-- 1. El calculo, aparte del permiso -------------------------------------------

-- Una sola cuenta, en un solo sitio. Partirlo en dos funciones en vez de
-- copiar la consulta: dos sitios calculando el mismo saldo con criterios
-- distintos significaria cobrar dos veces una verificacion, o ninguna.
create or replace function public.consumo_verificaciones_de(p_unidad_id uuid)
returns table (
  incluidas integer,
  suscritas_usadas integer,
  suplementarias integer,
  suplementarias_usadas integer,
  vencimiento_suplementarias date
)
language sql
stable security definer
set search_path = public, pg_temp
as $fn$
  select
    coalesce(s.verificaciones_base, 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_base'),
    -- Solo los paquetes vigentes: uno vencido no suma saldo.
    coalesce((select sum(p.cantidad)::int
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= current_date)), 0),
    (select count(*)::int
       from public.verificacion_antecedentes v
      where v.unidad_id = p_unidad_id
        and v.origen = 'paquete_complementario'),
    (select max(p.vence_en)
       from public.paquete_verificaciones p
      where p.unidad_id = p_unidad_id
        and (p.vence_en is null or p.vence_en >= current_date))
  from public.suscripcion_renta_corta s
  where s.unidad_id = p_unidad_id;
$fn$;

comment on function public.consumo_verificaciones_de(uuid) is
  'El saldo de verificaciones de una vivienda, SIN mirar quien pregunta. Interna: la de la app es `consumo_verificaciones`, que ademas comprueba el permiso.';

revoke execute on function public.consumo_verificaciones_de(uuid)
  from anon, authenticated;

-- La publica conserva su firma y su contrato --sigue sin decir nada de una
-- vivienda ajena--, pero ya no repite la cuenta.
create or replace function public.consumo_verificaciones(p_unidad_id uuid)
returns table (
  incluidas integer,
  suscritas_usadas integer,
  suplementarias integer,
  suplementarias_usadas integer,
  vencimiento_suplementarias date
)
language sql
stable security definer
set search_path = public, pg_temp
as $fn$
  select * from public.consumo_verificaciones_de(p_unidad_id)
  where public.puede_operar_unidad(p_unidad_id);
$fn$;

-- 2. Y el descuento, tampoco --------------------------------------------------

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

  -- La interna: esta funcion la llama tambien el precheckin, donde no hay
  -- sesion. Con la publica el saldo salia vacio y se leia como "sin
  -- suscripcion", que es un mensaje falso sobre la vivienda de otro.
  select incluidas, suscritas_usadas, suplementarias, suplementarias_usadas
    into v_base, v_usadas_b, v_paq, v_usadas_p
  from public.consumo_verificaciones_de(v_unidad);

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

-- 3. Y si aun asi no corre, que se sepa por que -------------------------------

alter table public.visita
  add column if not exists precheckin_aviso text;

comment on column public.visita.precheckin_aviso is
  'Por que no corrio la verificacion automatica al cerrar el preregistro. Un paso en gris sin explicacion no le sirve a nadie: el anfitrion es el unico que puede comprar un paquete, y para eso tiene que saber que hace falta.';

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
  v_aviso     text;
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

  -- La verificacion de antecedentes corre aqui: el KT dice que es automatica
  -- en este paso, sin intervencion del anfitrion ni visibilidad para el
  -- huesped.
  --
  -- Si no se puede, NO se bloquea el cierre --que un huesped no pueda terminar
  -- su registro porque su anfitrion no renovo un plan seria castigar a quien
  -- no decide-- pero el motivo se guarda. Tragarselo en silencio ya escondio
  -- un fallo de verdad: `consumo_verificaciones` devolvia vacio sin sesion y
  -- se leia como "sin suscripcion".
  begin
    perform public.anotar_verificacion(v_titular.id);
  exception when others then
    v_aviso := sqlerrm;
  end;

  update public.visita
  set precheckin_completado_en = now(),
      precheckin_aviso = v_aviso
  where id = v_visita.id;

  update public.invitado
  set precheckin_completado_en = now()
  where id = v_titular.id;

  return v_token;
end;
$fn$;
