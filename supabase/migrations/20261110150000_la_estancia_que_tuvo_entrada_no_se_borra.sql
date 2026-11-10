-- La estancia en la que ya entró alguien no se borra (10/11/2026, decidido con
-- el cliente).
--
-- `una_visita_que_entro_no_la_borra_el_vecino` dejaba fuera a las estancias de
-- huésped: el anfitrión podía retirar una reserva con gente dentro, o una ya
-- terminada con su reporte TRA y sus verificaciones de documento. Desde hoy:
-- mientras nadie ha entrado se puede eliminar (las que no llegaron); con
-- alguien dentro se termina la estancia; terminada, queda como constancia.
-- Vale para todos los que entran con sesión, también la portería y la
-- administración; la clave de servicio (limpiezas) sigue pudiendo.
-- Solo aditiva: misma función, mismo disparador.

create or replace function public.una_visita_que_entro_no_la_borra_el_vecino()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- En un UPDATE solo cuenta si se está retirando; en un DELETE, siempre.
  se_retira boolean;
begin
  if tg_op = 'DELETE' then
    se_retira := true;
  else
    se_retira := new.deleted_at is not null;
  end if;

  if se_retira
     and auth.uid() is not null
     and old.tipo <> 'huesped_temporal'
     and old.estado in ('ingresada', 'finalizada')
     and old.deleted_at is null
     and not public.es_personal_condominio(old.condominio_id)
  then
    raise exception 'Esta visita ya entró al edificio y queda como constancia: no se puede borrar.'
      using errcode = '42501';
  end if;

  -- La estancia de huésped en la que ya entró alguien (10/11/2026).
  if se_retira
     and auth.uid() is not null
     and old.tipo = 'huesped_temporal'
     and old.deleted_at is null
     and (old.estado in ('ingresada', 'finalizada')
          or exists (select 1 from public.invitado i
                      where i.visita_id = old.id and i.ingreso_en is not null))
  then
    raise exception '%', case when old.estado = 'finalizada'
        then 'Esta estancia ya terminó y queda como constancia: no se puede eliminar.'
        else 'En esta estancia ya entró alguien: no se elimina, se termina con «Terminar estancia».'
      end
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
