-- ----------------------------------------------------------------------------
-- Deshacer una entrega no vuelve a avisar
-- ----------------------------------------------------------------------------
-- Un envío marcado como entregado por error se devuelve a portería. El
-- disparador avisaba cada vez que el estado pasaba a `en_porteria`, así que al
-- vecino le llegaba otro «Correspondencia recibida» por un paquete del que ya
-- se le había avisado: parecía uno nuevo.
--
-- Deshacer es corregir un error de quien registra, no una novedad para la
-- vivienda. Decidido con el cliente el 12/10/2026.
--
-- Lo único que cambia es la condición del primer aviso: no se manda cuando el
-- estado anterior era `entregado`. El alta (sin estado anterior) y el paso de
-- `no_recibido` a portería siguen avisando.

create or replace function public.notificar_correspondencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anterior public.estado_correspondencia := null;
begin
  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado = 'en_porteria'
     and v_anterior is distinct from 'en_porteria'
     and v_anterior is distinct from 'entregado' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_recibida',
      'Correspondencia recibida',
      coalesce(new.empresa, 'Un paquete') || ' llegó a portería.',
      'correspondencia', new.id, new.recibida_por,
      -- El huésped no: no puede abrir la correspondencia del propietario y el
      -- mensaje lleva el nombre de la empresa.
      true);

  elsif new.estado = 'entregado' and v_anterior is distinct from 'entregado' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_entregada',
      'Correspondencia entregada',
      'Se entregó el envío' ||
        coalesce(' a ' || new.entregada_a, '') || '.',
      'correspondencia', new.id, null,
      true);
  end if;

  return new;
end;
$$;
