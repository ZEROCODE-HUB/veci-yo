-- Las listas del panel llegan en vivo a la app (Para Claude 220 y 221,
-- 04/11/2026): al renombrar, agregar u ocultar un cargo del equipo
-- administrativo o un motivo para eliminar la cuenta en Panel › Más › Listas,
-- quien tenía la app abierta seguía viendo la lista vieja hasta diez minutos.
--
-- `catalogo_opcion` entra en la publicación de Realtime. Su política de
-- lectura es abierta (`true`), así que el aviso llega a todos; la app solo
-- vuelve a pedir sus listas, no lee nada del aviso. El panel no borra
-- opciones: las apaga (`activo`), y eso también es un cambio que llega.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'catalogo_opcion'
  ) then
    alter publication supabase_realtime add table public.catalogo_opcion;
  end if;
end $$;
