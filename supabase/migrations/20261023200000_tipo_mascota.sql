-- Los tipos de mascota (QA 23/10/2026). En su propio archivo: un tipo nuevo no
-- se puede usar en la misma transacción que lo crea.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_mascota') then
    create type public.tipo_mascota as enum ('perro', 'gato', 'otra');
  end if;
end $$;

comment on type public.tipo_mascota is
  'Qué mascota trae un huésped: perro, gato u otra (se describe en el nombre).';
