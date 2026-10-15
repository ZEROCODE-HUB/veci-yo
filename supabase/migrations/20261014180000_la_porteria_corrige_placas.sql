/*
  La porteria corrige placas y apunta vehiculos (14/10/2026).

  Lo pidio la responsable de producto: «el guardia puede editar
  estacionamientos con parametros del edificio... si el departamento tiene
  estacionamiento, puede editar las placas». Hasta hoy una placa solo se
  escribia al crear la visita y nadie podia corregirla despues: si el huesped
  llegaba en otro carro, la porteria no tenia donde anotarlo.

  - `cambiar_placa(vehiculo, placa)`: la porteria del edificio, sobre una
    visita que puede ver (hoy, mañana o dentro), o quien opera la vivienda.
  - `agregar_vehiculo_en_porteria(visita, placa, tipo)`: el que llega en la
    puerta. Los disparadores de siempre aplican las reglas del edificio
    (`respetar_permite_cocheras` para huespedes).

  Solo aditiva.
*/

create or replace function public.cambiar_placa(p_vehiculo_id uuid, p_placa text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.visita%rowtype;
begin
  select vi.* into v
  from public.vehiculo_visita ve
  join public.visita vi on vi.id = ve.visita_id
  where ve.id = p_vehiculo_id;

  if v.id is null then
    raise exception 'Ese vehiculo no existe';
  end if;
  if not (public.puede_ver_visita(v.id)
          and (public.es_guardia_de_condominio(v.condominio_id)
               or public.puede_operar_unidad(v.unidad_id))) then
    raise exception 'No puedes cambiar las placas de esta visita';
  end if;
  if coalesce(btrim(p_placa), '') = '' then
    raise exception 'Falta la placa';
  end if;

  update public.vehiculo_visita
     set placa = upper(regexp_replace(btrim(p_placa), '[\s-]', '', 'g'))
   where id = p_vehiculo_id;
end;
$$;

comment on function public.cambiar_placa(uuid, text) is
  'Corrige la placa de un vehiculo de una visita: la porteria del edificio (sobre lo que puede ver) o quien opera la vivienda.';

grant execute on function public.cambiar_placa(uuid, text) to authenticated;

create or replace function public.agregar_vehiculo_en_porteria(
  p_visita_id uuid,
  p_placa     text,
  p_tipo      text default null
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
  if v.id is null then
    raise exception 'Esa visita no existe';
  end if;
  if not (public.es_guardia_de_condominio(v.condominio_id) and public.puede_ver_visita(v.id)) then
    raise exception 'Solo la porteria del edificio puede apuntar vehiculos aqui';
  end if;
  if v.estado in ('cancelada', 'finalizada') then
    raise exception 'Esa visita ya termino';
  end if;
  if coalesce(btrim(p_placa), '') = '' then
    raise exception 'Falta la placa';
  end if;

  insert into public.vehiculo_visita (visita_id, placa, tipo)
  values (v.id, upper(regexp_replace(btrim(p_placa), '[\s-]', '', 'g')),
          nullif(btrim(coalesce(p_tipo, '')), '')::public.tipo_vehiculo)
  returning vehiculo_visita.id into id;
  return id;
end;
$$;

comment on function public.agregar_vehiculo_en_porteria(uuid, text, text) is
  'La porteria apunta el vehiculo con el que llega una visita. Las reglas del edificio las aplican los disparadores de vehiculo_visita.';

grant execute on function public.agregar_vehiculo_en_porteria(uuid, text, text) to authenticated;
