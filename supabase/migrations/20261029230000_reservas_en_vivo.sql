-- Las reservas avisan por Realtime (29/10/2026, Para Claude 151 y 152): la
-- lista de la portería se pone al día al momento cuando alguien reserva o sube
-- un comprobante. Cada quien solo recibe las filas que su RLS le deja leer.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'reserva_zona') then
    alter publication supabase_realtime add table public.reserva_zona;
  end if;
end $$;
