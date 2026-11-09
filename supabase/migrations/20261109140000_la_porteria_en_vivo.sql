-- Las pantallas de la portería se ponen al día solas (09/11/2026, Correcciones
-- fila 20: «que se actualice en tiempo real varias pantallas en guardia de
-- seguridad»).
--
-- Las visitas, sus invitados, la verificación del documento, los vehículos y
-- la asignación de estacionamientos no estaban en la publicación de cambios
-- en vivo: la lista de visitas se refrescaba cada minuto y el inicio de la
-- portería, al volver a la app. Se añaden; la app (`useVisitasEnVivo`) solo
-- vuelve a pedir lo suyo al enterarse, sin leer lo que llega, y lo que vuelve
-- a pedir pasa por RLS como siempre. Solo aditiva.

do $$
declare
  t text;
begin
  foreach t in array array['visita', 'invitado', 'verificacion_documento',
                           'vehiculo_visita', 'asignacion_estacionamiento']
  loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
