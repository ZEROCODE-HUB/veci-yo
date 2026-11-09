-- Una reserva futura no entra (09/11/2026, Correcciones fila 13: «no debe
-- dejar registrar como guardia, para ingreso, un huésped que tiene reserva
-- futura, pero sí uno que tiene reserva pasada»).
--
-- Hasta hoy la portería veía las estancias de mañana y podía marcar su
-- llegada; la pantalla solo avisaba «queda anotado que entró antes». Ahora la
-- base lo rechaza para una estancia de huésped cuyo primer día es posterior a
-- hoy en el edificio (`hoy_en_el_edificio`). Una que ya empezó, aunque llegue
-- tarde, entra como siempre.
--
-- Va después del `auth.uid() is null`, igual que el resto de las reglas de
-- portería: la clave de servicio (pruebas, herramientas) no pasa por aquí.

create or replace function public.no_entra_si_el_documento_no_coincide()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_estado       estado_verificacion;
  v_tipo         tipo_visita;
  v_condominio   uuid;
  v_instruccion  instruccion_documento;
  v_exige        boolean;
  v_tiene_doc    boolean;
  v_responsable  estado_verificacion;
  v_desde        date;
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

  select vi.tipo, vi.condominio_id, vi.instruccion_documento, vi.fecha_desde
    into v_tipo, v_condominio, v_instruccion, v_desde
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
