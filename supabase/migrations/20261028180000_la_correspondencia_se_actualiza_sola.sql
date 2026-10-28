-- La correspondencia se actualiza sola en la pantalla del vecino (Para Claude
-- 123, 28/10/2026): si la portería borraba un registro, el vecino lo seguía
-- viendo hasta salir y volver a entrar.
--
-- La tabla entra en la publicación de Realtime, como ya están `mensaje`,
-- `alarma_sos` y `llamada_internet`. Realtime aplica la política de lectura a
-- cada evento, así que a cada uno solo le llegan los cambios de lo que ya
-- puede ver. El borrado es lógico (`deleted_at`) y `correspondencia_lectura`
-- no filtra por esa columna, así que el aviso del borrado también le llega.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'correspondencia'
  ) then
    alter publication supabase_realtime add table public.correspondencia;
  end if;
end $$;
