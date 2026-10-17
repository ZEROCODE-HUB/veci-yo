-- El país del teléfono de un contacto del edificio. Sin él, un número no se
-- puede marcar desde fuera (es la regla de `CampoTelefono`). Aditiva.
alter table public.contacto_condominio add column if not exists codigo_pais text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'codigo_pais_es_iso2'
      and conrelid = 'public.contacto_condominio'::regclass
  ) then
    alter table public.contacto_condominio
      add constraint codigo_pais_es_iso2
      check (codigo_pais is null or codigo_pais ~ '^[A-Z]{2}$');
  end if;
end $$;
