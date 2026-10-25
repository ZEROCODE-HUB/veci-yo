-- Una reserva de zona no dura más que el máximo.
--
-- Parametrización (25/10/2026): la duración máxima vivía solo en la pantalla.
-- Las tres pantallas ya leían `zona_duracion_maxima_por_defecto` (240) cuando
-- la zona no tiene la suya, pero la base no comprobaba nada: una reserva
-- pedida por API podía durar el día entero, y el comentario de la columna
-- decía «vacío = sin máximo» mientras la app decía 240.
--
-- Ahora lo dice y lo cumple la base, con el mismo criterio que la pantalla.

create or replace function public.reserva_no_pasa_de_la_duracion()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_maximo int;
  v_minutos int;
begin
  if new.hora_inicio is null or new.hora_fin is null or new.hora_fin <= new.hora_inicio then
    return new;
  end if;

  select coalesce(nullif(z.duracion_maxima_min, 0),
                  public.parametro_entero('zona_duracion_maxima_por_defecto', z.condominio_id))
    into v_maximo
  from public.zona_comun z
  where z.id = new.zona_id;

  v_minutos := extract(epoch from (new.hora_fin - new.hora_inicio))::int / 60;
  if v_maximo is not null and v_minutos > v_maximo then
    raise exception 'Una reserva de esta zona dura como mucho % minutos.', v_maximo
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.reserva_no_pasa_de_la_duracion() is
  'Una reserva de zona no dura más que la duración máxima de la zona o, si '
  'no tiene, que `zona_duracion_maxima_por_defecto`. El mismo criterio que la '
  'pantalla.';

revoke all on function public.reserva_no_pasa_de_la_duracion() from public, anon, authenticated;

drop trigger if exists reserva_zona_duracion_maxima on public.reserva_zona;
create trigger reserva_zona_duracion_maxima
  before insert or update of hora_inicio, hora_fin, zona_id on public.reserva_zona
  for each row
  execute function public.reserva_no_pasa_de_la_duracion();

comment on column public.zona_comun.duracion_maxima_min is
  'Minutos que puede durar como mucho una reserva. Vacío = el de la '
  'plataforma (`zona_duracion_maxima_por_defecto`), no «sin máximo». Lo '
  'cumple el disparador `reserva_zona_duracion_maxima`.';
