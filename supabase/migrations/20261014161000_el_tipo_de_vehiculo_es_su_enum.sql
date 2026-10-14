/*
  `agregar_vehiculo_de_estancia` pasaba el tipo como texto a una columna
  `tipo_vehiculo`, y fallaba siempre. Lo pillo su recorrido. (14/10/2026)
*/

create or replace function public.agregar_vehiculo_de_estancia(
  p_visita_id      uuid,
  p_placa          text,
  p_tipo           text default null,
  p_responsable_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v  public.visita%rowtype;
  id uuid;
begin
  select * into v from public.visita where visita.id = p_visita_id;
  if v.id is null or v.tipo <> 'huesped_temporal' then
    raise exception 'Esa estancia no existe';
  end if;
  if not public.puede_configurar_alojamiento(v.unidad_id) then
    raise exception 'Solo el anfitrion puede agregar vehiculos a la estancia';
  end if;
  if v.estado in ('cancelada', 'finalizada') then
    raise exception 'Esa estancia ya termino o se cancelo';
  end if;
  if coalesce(btrim(p_placa), '') = '' then
    raise exception 'Falta la placa';
  end if;

  insert into public.vehiculo_visita (visita_id, placa, tipo, responsable_invitado_id)
  values (v.id, upper(regexp_replace(btrim(p_placa), '[\s-]', '', 'g')),
          nullif(btrim(coalesce(p_tipo, '')), '')::public.tipo_vehiculo, p_responsable_id)
  returning vehiculo_visita.id into id;
  return id;
end;
$$;

