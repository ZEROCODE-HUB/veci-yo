-- El chat llega en vivo (22/10/2026). «Si uno envía un mensaje y el otro
-- tiene el chat abierto, no se refleja» (Para Claude, 21/10/2026): la
-- conversación solo pedía los mensajes al abrirse. La app escucha ahora los
-- mensajes nuevos por Realtime, que respeta `mensaje_lectura`: a cada uno le
-- llegan solo los de las conversaciones que puede ver.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensaje'
  ) then
    alter publication supabase_realtime add table public.mensaje;
  end if;
end $$;
