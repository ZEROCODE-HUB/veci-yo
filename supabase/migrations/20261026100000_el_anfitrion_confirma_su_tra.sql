-- El anfitrión confirma lo que se declara a la TRA antes de enviarlo.
--
-- Decisión del cliente (26/10/2026): «al mandar el reporte por TRA, que
-- siempre le salga un modal al anfitrión con lo que se va a reportar, y que
-- eso se pueda editar». El costo lo escribe el huésped en el preregistro, en
-- la moneda que quiera, y el ministerio lo pide en pesos colombianos: hasta
-- hoy, un costo en dólares salía como si fueran pesos.
--
-- Aquí va la mitad que escribe: lo que el anfitrión corrige queda guardado
-- en la estancia, de modo que lo declarado y lo que se ve después coinciden.
-- La otra mitad --no mandar un costo que no esté en pesos-- vive en
-- `reportar-tra`, que es la última puerta antes de salir a internet.
--
-- Solo aditiva: una función nueva.

create or replace function public.ajustar_datos_de_la_tra(
  p_visita_id uuid,
  p_costo numeric,
  p_motivo public.motivo_estancia,
  p_personas jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_unidad uuid;
  v_persona jsonb;
  v_tocadas int;
begin
  select v.unidad_id into v_unidad from public.visita v where v.id = p_visita_id;
  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  /*
    Escribe quien responde por la vivienda ante el ministerio: su
    propietario o el inquilino que la lleva. No la portería ni la
    administración del edificio, aunque puedan ver la estancia.
  */
  if not public.gestiona_la_vivienda(v_unidad) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  if p_costo is null then
    raise exception 'Falta el costo de la estancia en pesos colombianos';
  end if;
  if p_costo < 0 then
    raise exception 'El costo no puede ser negativo';
  end if;

  -- El ministerio lo pide en pesos: confirmado por el anfitrión, queda en COP.
  update public.visita
     set costo_estancia = p_costo,
         moneda_costo   = 'COP'
   where id = p_visita_id;

  -- El motivo se declara una vez, en el huésped principal.
  if p_motivo is not null then
    update public.invitado
       set motivo = p_motivo
     where visita_id = p_visita_id and es_titular;
  end if;

  if jsonb_typeof(coalesce(p_personas, '[]'::jsonb)) <> 'array' then
    raise exception 'Las personas van en una lista';
  end if;

  for v_persona in select * from jsonb_array_elements(coalesce(p_personas, '[]'::jsonb))
  loop
    update public.invitado
       set ciudad_residencia  = nullif(btrim(coalesce(v_persona->>'ciudad_residencia', '')), ''),
           ciudad_procedencia = nullif(btrim(coalesce(v_persona->>'ciudad_procedencia', '')), '')
     where id = (v_persona->>'invitado_id')::uuid
       and visita_id = p_visita_id;
    get diagnostics v_tocadas = row_count;
    -- Alguien de otra estancia no se toca, y se dice en vez de callarlo.
    if v_tocadas = 0 then
      raise exception 'Esa persona no es de esta estancia';
    end if;
  end loop;
end;
$$;

comment on function public.ajustar_datos_de_la_tra(uuid, numeric, public.motivo_estancia, jsonb) is
  'Guarda lo que el anfitrión confirma antes de reportar a la TRA: el costo en pesos colombianos (queda en COP), el motivo del huésped principal y las ciudades de cada persona. Solo quien gestiona la vivienda.';

revoke execute on function public.ajustar_datos_de_la_tra(uuid, numeric, public.motivo_estancia, jsonb) from public, anon;
grant execute on function public.ajustar_datos_de_la_tra(uuid, numeric, public.motivo_estancia, jsonb) to authenticated, service_role;
