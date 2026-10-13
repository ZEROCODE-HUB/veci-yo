-- ============================================================================
-- Quien entra sin verificar: el niño, el adulto sin documento y la visita
-- ============================================================================
-- Tres decisiones del cliente del 12/10/2026, sobre los puntos 194 y 195 de
-- REVISAR-A-OJO:
--
--   1. **El niño de una estancia** entra solo si el adulto que responde por
--      el ya fue verificado. No se le pide documento propio.
--   2. **Un adulto de una estancia sin documento declarado no entra**: no hay
--      con que compararlo. Antes pasaba sin verificacion.
--   3. **En una visita corriente lo decide el edificio**, con el interruptor
--      que ya existia --`condominio.verificar_documento_visitas`, «La porteria
--      verifica el documento»--. Hasta hoy ese interruptor solo cambiaba una
--      etiqueta; ahora, encendido, la llegada de quien declaro documento
--      exige la verificacion. Quien no declaro ninguno entra: en una visita
--      de amigos el documento es opcional.
--
-- Sigue obligando solo a quien tiene sesion, y un «no coincide» sigue
-- cerrando la puerta siempre.

create or replace function public.no_entra_si_el_documento_no_coincide()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_estado       estado_verificacion;
  v_tipo         tipo_visita;
  v_condominio   uuid;
  v_exige        boolean;
  v_tiene_doc    boolean;
  v_responsable  estado_verificacion;
begin
  -- Solo se mira al **marcar la llegada**. Quitarla, o cualquier otro cambio
  -- sobre el invitado, no tiene nada que ver con esto.
  if coalesce(new.llego, false) = false and new.ingreso_en is null then
    return new;
  end if;

  -- Y solo cuando la llegada es nueva: una fila que ya estaba dentro no se
  -- vuelve a juzgar cada vez que se le toca otra cosa.
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

  select vi.tipo, vi.condominio_id into v_tipo, v_condominio
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

  -- Una visita corriente: lo decide el edificio.
  select c.verificar_documento_visitas into v_exige
  from public.condominio c
  where c.id = v_condominio;

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
$fn$;

comment on function public.no_entra_si_el_documento_no_coincide() is
  'Impide marcar la llegada con la verificacion en no_coincide. En una estancia: el adulto necesita documento verificado y el menor, a su responsable verificado. En una visita corriente, quien declaro documento necesita verificacion si el edificio lo tiene encendido.';

comment on column public.condominio.verificar_documento_visitas is
  'Si la porteria tiene que verificar el documento del invitado antes de dejarle entrar. Encendido, la llegada de quien declaro documento se rechaza sin verificacion (12/10/2026); antes solo cambiaba una etiqueta.';
