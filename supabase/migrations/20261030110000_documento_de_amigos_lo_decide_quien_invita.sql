-- El documento de amigos y familiares lo decide quien invita (30/10/2026).
--
-- Lo definido con el cliente (reemplaza a la decisión del 29/10/2026, D-69,
-- que lo hacía obligatorio en toda visita):
--   · Huésped temporal: siempre (sin cambios).
--   · Profesional temporal y permanente: lo decide el edificio con
--     `condominio.verificar_documento_visitas`, que viene encendido; la
--     administración lo puede apagar.
--   · Amigos y familiares: el documento es opcional y por defecto NO se
--     verifica. Solo si quien invita lo pide al registrar la visita
--     (`visita.instruccion_documento = 'verificar'`).
-- Al marcar la llegada, la portería tiene que haber verificado el documento
-- en esos casos. Un «no coincide» sigue cerrando la puerta siempre. Solo
-- aditiva: se reemplaza la función, no se toca ningún dato.

create or replace function public.no_entra_si_el_documento_no_coincide()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_estado       estado_verificacion;
  v_tipo         tipo_visita;
  v_condominio   uuid;
  v_instruccion  instruccion_documento;
  v_exige        boolean;
  v_tiene_doc    boolean;
  v_responsable  estado_verificacion;
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

  select vi.tipo, vi.condominio_id, vi.instruccion_documento
    into v_tipo, v_condominio, v_instruccion
  from public.visita vi
  where vi.id = new.visita_id;

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

comment on column public.condominio.verificar_documento_visitas is
  'Si la portería verifica el documento de los profesionales (temporales y permanentes) antes de marcar su llegada. Viene encendido. En amigos y familiares lo decide quien invita (visita.instruccion_documento); a los huéspedes se les verifica siempre (30/10/2026).';
