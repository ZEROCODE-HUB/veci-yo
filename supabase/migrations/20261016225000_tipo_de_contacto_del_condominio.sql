-- Los tipos de contacto del edificio (16/10/2026). En su propio archivo, como
-- todo valor de enum. Uno nuevo se añade con `alter type ... add value` en otro.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_contacto_condominio') then
    create type public.tipo_contacto_condominio as enum (
      'equipo',
      'empresa_seguridad',
      'empresa_limpieza'
    );
  end if;
end $$;
