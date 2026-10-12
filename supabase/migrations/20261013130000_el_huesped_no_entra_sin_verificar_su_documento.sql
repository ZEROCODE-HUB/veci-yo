-- ============================================================================
-- El huésped de renta corta no entra sin que la portería verifique su documento
-- ============================================================================
-- Decidido con el cliente el 12/10/2026, tras recorrer la renta corta entera:
-- el guardia podía marcar la llegada sin abrir siquiera «Foto y verificación
-- del documento». La comparación del número era opcional y vivía dos pantallas
-- más adentro.
--
-- Hasta hoy lo único que cerraba la puerta era un **no coincide** explícito
-- (`20261002090000`). Para una visita corriente sigue siendo así: hay edificios
-- que no piden documento y la portería registra a gente sin preregistro. Para
-- un **huésped temporal** con documento declarado, la llegada exige ahora que
-- la verificación esté en `verificado`.
--
-- Quien no declaró documento --un niño sin cédula, alguien que no hizo el
-- preregistro-- no tiene con qué compararse: no se le bloquea aquí. Que eso
-- deba impedir la entrada es otra decisión (REVISAR-A-OJO 194).
--
-- Solo obliga a quien tiene sesión. El servidor (crons, sincronización) no
-- marca llegadas, y si un día lo hace no es la portería quien responde.

create or replace function public.no_entra_si_el_documento_no_coincide()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_estado estado_verificacion;
  v_tipo tipo_visita;
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

  select vi.tipo into v_tipo
  from public.visita vi
  where vi.id = new.visita_id;

  if v_tipo = 'huesped_temporal'
     and auth.uid() is not null
     and nullif(btrim(new.documento_numero), '') is not null
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
  'Impide marcar la llegada de un invitado con la verificacion en no_coincide. Y, si es huesped temporal con documento declarado, mientras no este en verificado.';
