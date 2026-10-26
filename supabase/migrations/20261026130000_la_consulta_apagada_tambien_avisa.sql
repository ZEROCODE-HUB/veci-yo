-- Con la consulta de antecedentes apagada, al anfitrión también le llega el
-- aviso (hueco 29).
--
-- El cliente respondió el 21/10/2026: «que le llegue notificación push».
-- Con el interruptor apagado se anota la verificación como `simulado` con el
-- resultado de `antecedentes_resultado_si_apagado` (hoy `error_proveedor`), y
-- la ficha le pide al anfitrión que decida a mano. Pero este disparador se
-- saltaba las simuladas, así que el anfitrión no se enteraba hasta abrir la
-- reserva. El push sale solo al crearse la notificación
-- (`notificacion_mandar_push`).
--
-- Solo aditiva: reemplaza el cuerpo de la función; el disparador es el mismo.

create or replace function public.avisar_verificacion_por_revisar()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  i public.invitado%rowtype;
  v public.visita%rowtype;
  v_motivo text;
begin
  if new.resultado not in ('rechazada', 'error_proveedor') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.resultado is not distinct from new.resultado then
    return new;
  end if;

  select * into i from public.invitado where id = new.invitado_id;
  select * into v from public.visita where id = i.visita_id;
  if v.id is null then
    return new;
  end if;

  /*
    Una simulada no trae hallazgos, pero sí pide una decisión: la consulta no
    se hizo porque está apagada. Se dice así, para que no parezca un fallo del
    proveedor.
  */
  v_motivo := case
    when new.proveedor = 'simulado' then 'la consulta de antecedentes está apagada, así que no se revisó.'
    when new.resultado = 'rechazada' then 'el informe de antecedentes trae hallazgos.'
    else 'no se pudo hacer la consulta de antecedentes.'
  end;

  perform public.notificar_anfitrion(
    v.unidad_id, 'verificacion_requiere_revision',
    'Un huésped necesita tu aprobación',
    i.nombre || ': ' || v_motivo || ' Revisa su ficha y decide.',
    'visita', v.id
  );
  return new;
end;
$$;
