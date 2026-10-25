-- Una zona común sin moneda toma la de su edificio.
--
-- Parametrización (25/10/2026): la app proponía «COP» al crear una zona y
-- también lo escribía si la moneda llegaba vacía, aunque el edificio cobrara
-- en soles o en dólares. El edificio ya decide su moneda
-- (`moneda_del_condominio`, 18/10/2026); la zona la hereda si no dice otra.

create or replace function public.completar_moneda_de_la_zona()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.moneda is null or btrim(new.moneda) = '' then
    new.moneda := public.moneda_del_condominio(new.condominio_id);
  end if;
  return new;
end;
$$;

comment on function public.completar_moneda_de_la_zona() is
  'Si una zona común llega sin moneda, le pone la de su edificio.';

drop trigger if exists zona_comun_moneda_del_edificio on public.zona_comun;
create trigger zona_comun_moneda_del_edificio
  before insert or update of moneda on public.zona_comun
  for each row
  execute function public.completar_moneda_de_la_zona();
