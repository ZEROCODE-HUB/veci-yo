/*
  El QR de la estancia (14/10/2026).

  Lo pidio la responsable de producto: «si el huesped se crea cuenta en la app,
  le debe aparecer el QR del check-in, poder compartirlo como imagen». Y la
  porteria lo escanea para encontrar la estancia (bloque 3).

  `visita.codigo_acceso` existe desde el principio y no lo escribia nadie. Se
  escribe solo al cerrar el preregistro: un codigo aleatorio, no adivinable,
  que no dice nada por si mismo. Es una forma de **encontrar** la estancia, no
  una llave: la porteria la busca con su sesion y RLS sigue mandando.

  - disparador que pone el codigo al cerrar el preregistro (y relleno de las
    ya cerradas, que no lo tienen);
  - `mi_codigo_de_acceso(unidad)`: el del huesped con cuenta;
  - `estancia_por_codigo(codigo)`: para la porteria del edificio.

  Solo aditiva: rellena una columna vacia, no borra nada.
*/

create or replace function public.codigo_al_cerrar_el_preregistro()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.precheckin_completado_en is not null and new.codigo_acceso is null then
    new.codigo_acceso := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  end if;
  return new;
end;
$$;

drop trigger if exists visita_codigo_al_cerrar on public.visita;
create trigger visita_codigo_al_cerrar
  before update of precheckin_completado_en on public.visita
  for each row execute function public.codigo_al_cerrar_el_preregistro();

update public.visita
   set codigo_acceso = upper(encode(extensions.gen_random_bytes(6), 'hex'))
 where tipo = 'huesped_temporal'
   and precheckin_completado_en is not null
   and codigo_acceso is null;

create or replace function public.mi_codigo_de_acceso(p_unidad_id uuid)
returns table (codigo text, fecha_desde date, fecha_hasta date, condominio text, unidad text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.codigo_acceso, v.fecha_desde, v.fecha_hasta, c.nombre, u.codigo
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.condominio c on c.id = v.condominio_id
  join public.unidad u on u.id = v.unidad_id
  where i.usuario_id = auth.uid()
    and v.unidad_id = p_unidad_id
    and v.codigo_acceso is not null
    and v.estado not in ('cancelada', 'finalizada')
    and v.fecha_hasta >= (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
  order by v.fecha_desde
  limit 1;
$$;

comment on function public.mi_codigo_de_acceso(uuid) is
  'El codigo (para el QR) de la estancia vigente o proxima de quien pregunta en esa vivienda.';

grant execute on function public.mi_codigo_de_acceso(uuid) to authenticated;

create or replace function public.estancia_por_codigo(p_codigo text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.id
  from public.visita v
  where v.codigo_acceso = upper(btrim(p_codigo))
    and v.estado not in ('cancelada', 'finalizada')
    and public.es_guardia_de_condominio(v.condominio_id)
  limit 1;
$$;

comment on function public.estancia_por_codigo(text) is
  'La estancia de un QR, para la porteria de su edificio. A cualquier otro no le devuelve nada.';

grant execute on function public.estancia_por_codigo(text) to authenticated;
