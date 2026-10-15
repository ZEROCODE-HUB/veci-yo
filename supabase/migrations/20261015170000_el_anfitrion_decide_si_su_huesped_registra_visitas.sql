-- El anfitrion decide si su huesped registra visitas (15/10/2026).
--
-- En la configuracion del alojamiento el anfitrion elige «¿permites que tus
-- huespedes registren visitas?»: permitir a todos, prohibir a todos o aprobar
-- huesped por huesped. Se guardaba en `suscripcion_renta_corta.
-- visitas_de_huespedes` y **nadie lo miraba**: la politica de alta dejaba al
-- huesped registrar siempre. Otra casilla decorativa.
--
-- Ahora «prohibir a todos» se cumple en la base. «Aprobar huesped por huesped»
-- queda como esta --permite-- hasta que el cliente diga que significa
-- (aprobar cada visita o habilitar a cada huesped): esta preguntado.

create or replace function public.huesped_puede_registrar_visitas(p_unidad_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  -- Sin configuracion de renta corta no hay nada prohibido.
  select coalesce(
    (select s.visitas_de_huespedes is distinct from 'prohibir_todos'
       from public.suscripcion_renta_corta s
      where s.unidad_id = p_unidad_id),
    true
  );
$function$;

comment on function public.huesped_puede_registrar_visitas(uuid) is
  'Si el anfitrion deja a sus huespedes registrar visitas en esa vivienda. Solo «prohibir_todos» lo impide.';

drop policy if exists visita_alta on public.visita;
create policy visita_alta on public.visita
  for insert to authenticated
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (
      registrada_por = auth.uid()
      and unidad_id is not null
      and public.es_huesped_con_reserva(unidad_id)
      and public.huesped_puede_registrar_visitas(unidad_id)
    )
  );
