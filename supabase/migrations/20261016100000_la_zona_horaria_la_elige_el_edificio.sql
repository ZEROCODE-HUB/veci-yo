-- ----------------------------------------------------------------------------
-- La zona horaria la elige el edificio (16/10/2026, Parametrización)
-- ----------------------------------------------------------------------------
-- `condominio.zona_horaria` existe desde el principio y **nadie la leía**:
-- `zona_horaria_del_condominio` --la que deciden «hoy» y «una hora que ya
-- pasó» en reservas, visitas, avisos y turnos-- la sacaba del país, Bogotá o
-- Lima, y para cualquier otro país Bogotá.
--
-- Ahora manda la columna, que la administración elige en Arquitectura ›
-- Condominio. Sin valor, la del país como hasta hoy.
--
-- Un nombre que Postgres no conoce rompería todas esas funciones a la vez
-- --`at time zone 'Bogota'` es un error--, así que se comprueba al escribirlo
-- y no al usarlo.

create or replace function public.zona_horaria_del_condominio(p_condominio_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(btrim(c.zona_horaria), ''),
    case btrim(c.pais)
      when 'CO' then 'America/Bogota'
      when 'PE' then 'America/Lima'
      else 'America/Bogota'
    end
  )
  from public.condominio c
  where c.id = p_condominio_id;
$$;

create or replace function public.zona_horaria_valida()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.zona_horaria is not null
     and not exists (select 1 from pg_timezone_names where name = new.zona_horaria) then
    raise exception 'La zona horaria % no existe', new.zona_horaria
      using errcode = '22023';
  end if;
  return new;
end;
$$;

comment on function public.zona_horaria_valida() is
  'Rechaza una zona horaria que Postgres no conoce: la usan todas las reglas de «hoy» del edificio.';

drop trigger if exists condominio_zona_horaria_valida on public.condominio;
create trigger condominio_zona_horaria_valida
  before insert or update of zona_horaria on public.condominio
  for each row execute function public.zona_horaria_valida();
