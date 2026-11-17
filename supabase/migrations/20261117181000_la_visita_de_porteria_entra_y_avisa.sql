-- La visita que registra la portería nace «Ingresado», anunciada y avisada
-- (17/11/2026, pedido del cliente: «al registrar la visita desde la guardia,
-- queda directamente Ingresado; le llega un aviso a la gente del departamento
-- y queda en el historial de todos los residentes»).
--
-- Hasta hoy (`20261116130400_la_porteria_registra_amigos_y_temporales.sql`)
-- la visita del guardia nacía `programada` si el edificio exige verificar el
-- documento del profesional y lo traía (T-025): la base no deja entrar a nadie
-- sin verificarlo. Pero el guardia que la registra tiene a la persona delante
-- y acaba de copiar su documento: pedirle que después la «verifique» contra
-- lo que él mismo escribió es un paso de trámite. Ahora:
--
--   1. `visita.registrada_en_porteria`: la marca **la base**, nunca la app.
--      Solo el guardia activo del edificio, que firma la visita, de amigos o
--      temporal, y que no es de esa vivienda (si vive ahí, la anuncia como
--      vecino). Esa visita nace además anunciada: el aviso push hace de
--      anuncio, así que «Anuncié al residente» ya sale hecho.
--   2. Al darle entrada en el mismo alta, el documento que escribió el
--      guardia cuenta como verificado: queda una fila en
--      `verificacion_documento` con quién, cuándo y `coincidio_por =
--      'tecleado'`, igual que cuando la portería teclea el número.
--   3. `no_entra_si_el_documento_no_coincide` deja pasar **solo** ese alta
--      (INSERT, misma visita marcada, mismo guardia que la firmó). Cualquier
--      otra entrada sigue exigiendo la verificación como antes.
--   4. El aviso a la vivienda dice «Nueva visita: Ana ingresó al 501» y sale
--      una sola vez por visita (no uno por acompañante).
--
-- El historial: las visitas se leen por vivienda (`visita_lectura`:
-- `es_miembro_unidad(unidad_id)`), no por quien las creó, así que la ven todos
-- los de la vivienda sin tocar nada.

-- 1. La marca.
alter table public.visita
  add column if not exists registrada_en_porteria boolean not null default false;

comment on column public.visita.registrada_en_porteria is
  'La registró el guardia activo del edificio desde la portería, con la persona delante (17/11/2026). La pone la base al crear la visita (disparador visita_marcar_registro_de_porteria); la app no la puede cambiar. Con ella la visita nace anunciada y su documento cuenta como verificado.';

create or replace function public.marcar_registro_de_porteria()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Nadie la cambia después: es un hecho del alta.
  if tg_op = 'UPDATE' then
    new.registrada_en_porteria := old.registrada_en_porteria;
    return new;
  end if;

  new.registrada_en_porteria :=
    auth.uid() is not null
    and new.registrada_por = auth.uid()
    and new.tipo in ('amigos', 'temporal')
    and public.es_guardia_activo(new.condominio_id)
    and not (new.unidad_id is not null and public.es_miembro_unidad(new.unidad_id));

  if new.registrada_en_porteria then
    -- El aviso a la vivienda es el anuncio (17/11/2026).
    new.anunciada_en  := coalesce(new.anunciada_en, now());
    new.anunciada_por := coalesce(new.anunciada_por, auth.uid());
  end if;
  return new;
end;
$function$;

revoke all on function public.marcar_registro_de_porteria() from public;

drop trigger if exists visita_marcar_registro_de_porteria on public.visita;
create trigger visita_marcar_registro_de_porteria
  before insert or update of registrada_en_porteria on public.visita
  for each row execute function public.marcar_registro_de_porteria();

-- 2. El documento que escribió el guardia, verificado.
create or replace function public.porteria_da_por_verificado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_marcada   boolean;
  v_registro  uuid;
  v_condominio uuid;
begin
  if auth.uid() is null or coalesce(new.es_menor, false)
     or nullif(btrim(coalesce(new.documento_numero, '')), '') is null then
    return new;
  end if;

  select v.registrada_en_porteria, v.registrada_por, v.condominio_id
    into v_marcada, v_registro, v_condominio
  from public.visita v
  where v.id = new.visita_id;

  if not coalesce(v_marcada, false)
     or v_registro is distinct from auth.uid()
     or not public.es_guardia_activo(v_condominio) then
    return new;
  end if;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones, aprobado_a_mano, coincidio_por)
  values
    (new.id, 'verificado', auth.uid(), now(),
     'Registrado en portería con el documento a la vista', false, 'tecleado')
  on conflict (invitado_id) do nothing;
  return new;
end;
$function$;

revoke all on function public.porteria_da_por_verificado() from public;

drop trigger if exists invitado_porteria_da_por_verificado on public.invitado;
create trigger invitado_porteria_da_por_verificado
  after insert on public.invitado
  for each row execute function public.porteria_da_por_verificado();

-- 3. La entrada del alta de portería no espera a la verificación.
--    Es la función de hoy (20261109130000 y anteriores) con un único cambio,
--    marcado más abajo.
create or replace function public.no_entra_si_el_documento_no_coincide()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_estado       estado_verificacion;
  v_tipo         tipo_visita;
  v_condominio   uuid;
  v_instruccion  instruccion_documento;
  v_exige        boolean;
  v_tiene_doc    boolean;
  v_responsable  estado_verificacion;
  v_desde        date;
  v_porteria     boolean;
  v_registro     uuid;
begin
  -- Solo se mira al **marcar la llegada**.
  if coalesce(new.llego, false) = false and new.ingreso_en is null then
    return new;
  end if;

  -- Y solo cuando la llegada es nueva.
  if tg_op = 'UPDATE'
     and coalesce(old.llego, false) = coalesce(new.llego, false)
     and old.ingreso_en is not distinct from new.ingreso_en then
    return new;
  end if;

  select v.estado into v_estado
  from public.verificacion_documento v
  where v.invitado_id = new.id;

  if v_estado = 'no_coincide' then
    raise exception
      'El documento de esta persona no coincide con el del preregistro: no puede registrarse su ingreso.'
      using errcode = 'check_violation',
            constraint = 'invitado_documento_no_coincide';
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select vi.tipo, vi.condominio_id, vi.instruccion_documento, vi.fecha_desde,
         vi.registrada_en_porteria, vi.registrada_por
    into v_tipo, v_condominio, v_instruccion, v_desde, v_porteria, v_registro
  from public.visita vi
  where vi.id = new.visita_id;

  -- Una reserva que todavía no empezó no entra (09/11/2026, Correcciones
  -- fila 13). Desde el día de llegada sí, aunque llegue tarde.
  if v_tipo = 'huesped_temporal'
     and v_desde is not null
     and v_desde > public.hoy_en_el_edificio(v_condominio) then
    raise exception
      'La reserva empieza el %: todavía no puede ingresar.', to_char(v_desde, 'DD/MM/YYYY')
      using errcode = 'check_violation',
            constraint = 'invitado_reserva_futura';
  end if;

  v_tiene_doc := nullif(btrim(new.documento_numero), '') is not null;

  if v_tipo = 'huesped_temporal' then
    if coalesce(new.es_menor, false) then
      -- El niño entra con su adulto, y es al adulto a quien se verifica.
      if new.responsable_id is null then
        raise exception
          'Este menor no tiene un adulto responsable registrado: no puede registrarse su ingreso.'
          using errcode = 'check_violation',
                constraint = 'invitado_menor_sin_responsable';
      end if;

      select v.estado into v_responsable
      from public.verificacion_documento v
      where v.invitado_id = new.responsable_id;

      if v_responsable is distinct from 'verificado' then
        raise exception
          'Primero hay que verificar el documento del adulto que responde por este menor.'
          using errcode = 'check_violation',
                constraint = 'invitado_responsable_sin_verificar';
      end if;
      return new;
    end if;

    if not v_tiene_doc then
      raise exception
        'Esta persona no tiene un documento registrado: tiene que completar su registro antes de ingresar.'
        using errcode = 'check_violation',
              constraint = 'invitado_sin_documento';
    end if;

    if v_estado is distinct from 'verificado' then
      raise exception
        'Antes de registrar el ingreso hay que verificar el documento de esta persona.'
        using errcode = 'check_violation',
              constraint = 'invitado_documento_sin_verificar';
    end if;
    return new;
  end if;

  /*
    El cambio del 17/11/2026: la persona que el guardia registra en la puerta
    entra en el mismo alta. Él copió el documento con la persona delante, y
    `porteria_da_por_verificado` deja constancia de esa verificación en cuanto
    la fila existe. Solo el INSERT, solo la visita marcada por la base y solo
    el mismo guardia: marcar después la entrada de otro sigue la regla de
    siempre.
  */
  if tg_op = 'INSERT'
     and coalesce(v_porteria, false)
     and v_registro = auth.uid()
     and public.es_guardia_activo(v_condominio) then
    return new;
  end if;

  if v_tipo = 'amigos' then
    -- Amigos y familiares: solo si quien invitó lo pidió (30/10/2026).
    v_exige := v_instruccion = 'verificar';
  else
    -- Profesionales: lo decide el edificio.
    select c.verificar_documento_visitas into v_exige
    from public.condominio c
    where c.id = v_condominio;
  end if;

  if coalesce(v_exige, false)
     and v_tiene_doc
     and v_estado is distinct from 'verificado' then
    raise exception
      'Antes de registrar el ingreso hay que verificar el documento de esta persona.'
      using errcode = 'check_violation',
            constraint = 'invitado_documento_sin_verificar';
  end if;

  return new;
end;
$function$;

-- 4. El aviso: «Nueva visita», una vez por visita.
--    La función de hoy (20261110140000) con el texto y el «una vez» de la
--    portería; lo demás, igual.
create or replace function public.notificar_ingreso_invitado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_unidad uuid;
  v_condominio uuid;
  v_registro uuid;
  v_fecha date;
  v_tipo text;
  v_ingreso_anterior timestamptz := null;
  v_de_la_vivienda boolean;
  v_huesped uuid;
  v_porteria boolean;
  v_codigo text;
  v_otros int;
  v_titulo text := 'Tu visita ingresó';
  v_mensaje text;
begin
  if tg_op = 'UPDATE' then
    v_ingreso_anterior := old.ingreso_en;
  end if;

  if new.ingreso_en is null or v_ingreso_anterior is not null then
    return new;
  end if;

  select v.unidad_id, v.condominio_id, v.registrada_por, v.fecha_desde, v.tipo::text,
         v.registrada_en_porteria
    into v_unidad, v_condominio, v_registro, v_fecha, v_tipo, v_porteria
  from public.visita v where v.id = new.visita_id;

  -- Las visitas a la administración no tienen unidad a la que avisar.
  if v_unidad is null then
    return new;
  end if;

  v_mensaje := new.nombre || ' ingresó al condominio.';

  /*
    La visita que registra la portería (17/11/2026): la vivienda no sabía que
    venía, así que el aviso dice que es nueva y a qué departamento. Todas sus
    personas entran en el mismo alta: un aviso por visita, desde el titular,
    con cuántos vienen con él. Los disparadores AFTER ROW corren al final de
    la sentencia, así que aquí ya están todas las filas.
  */
  if tg_op = 'INSERT' and coalesce(v_porteria, false) then
    if not coalesce(new.es_titular, false) then
      return new;
    end if;
    select u.codigo into v_codigo from public.unidad u where u.id = v_unidad;
    select count(*) - 1 into v_otros
    from public.invitado i
    where i.visita_id = new.visita_id and i.ingreso_en is not null;

    v_titulo := 'Nueva visita';
    v_mensaje := new.nombre
      || case
           when v_otros = 1 then ' y 1 persona más ingresaron'
           when v_otros > 1 then ' y ' || v_otros || ' personas más ingresaron'
           else ' ingresó'
         end
      || coalesce(' al ' || v_codigo, ' al condominio')
      || '. La registró la portería.';
  end if;

  -- ¿La anunció alguien de la vivienda que no es su huésped (el anfitrión que
  -- manda al técnico)? Entonces es del dueño, como siempre.
  v_de_la_vivienda := v_registro is not null and exists (
    select 1 from public.membresia_unidad m
     where m.unidad_id = v_unidad and m.usuario_id = v_registro
       and m.activo and m.rol <> 'huesped_temporal');

  -- Con un huésped alojado ese día, y la visita no la anunció el dueño: es
  -- del huésped. Se le avisa a él, no a la vivienda (10/11/2026).
  if v_tipo <> 'huesped_temporal' and not v_de_la_vivienda
     and public.huesped_alojado_hasta(v_unidad, coalesce(v_fecha, public.hoy_en_el_edificio(v_condominio))) is not null then
    for v_huesped in
      select distinct m.usuario_id
        from public.membresia_unidad m
       where m.unidad_id = v_unidad and m.rol = 'huesped_temporal' and m.activo
         and m.usuario_id is not null
         and (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(v_condominio))
         and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(v_condominio))
    loop
      if public.quiere_aviso(v_huesped, 'visita_ingreso', 'app') then
        insert into public.notificacion
          (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
        values
          (v_huesped, v_condominio, 'visita_ingreso', v_titulo,
           v_mensaje, 'visita', new.visita_id);
      end if;
    end loop;
    return new;
  end if;

  -- Los residentes de la vivienda, no sus huéspedes (15/10/2026).
  perform public.notificar_unidad(
    v_unidad, 'visita_ingreso',
    v_titulo,
    v_mensaje,
    'visita', new.visita_id, null, true);

  -- Y quien registró la visita si es un huésped de la vivienda: su invitado sí
  -- es suyo.
  if v_registro is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = v_unidad
      and m.usuario_id = v_registro
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(v_condominio))
  ) and public.quiere_aviso(v_registro, 'visita_ingreso', 'app') then
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    values
      (v_registro, v_condominio, 'visita_ingreso', v_titulo,
       v_mensaje, 'visita', new.visita_id);
  end if;
  return new;
end;
$function$;
