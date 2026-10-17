-- Los resultados ocultos de una encuesta no salen de la base (17/10/2026).
--
-- «Ocultar resultados» prometia que los vecinos no ven el recuento hasta que
-- la administracion lo publique, y lo cumplia solo la pantalla.
-- `resultados_publicacion` --la que da los recuentos-- no miraba la casilla, y
-- la app la llama para todas las encuestas: los numeros llegaban al telefono
-- de cualquier vecino de la audiencia. `resultados_a_la_vista` existia para
-- esto y no la llamaba nadie.
--
-- Ahora el recuento sale si esta a la vista, o a quien administra con permiso
-- de encuestas, que lo necesita para decidir si publicarlo.

create or replace function public.resultados_publicacion(p_publicacion_id uuid)
 returns table(opcion_id uuid, etiqueta text, votos bigint)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select o.id, o.etiqueta, count(v.id)
  from public.opcion_voto o
  left join public.voto v on v.opcion_id = o.id
  where o.publicacion_id = p_publicacion_id
    and public.puede_ver_publicacion(p_publicacion_id)
    and (
      public.resultados_a_la_vista(p_publicacion_id)
      or public.puede_coadmin(
        (select p.condominio_id from public.publicacion p where p.id = p_publicacion_id),
        'visualizarEncuestas'
      )
    )
  group by o.id, o.etiqueta
  order by o.orden;
$function$;
