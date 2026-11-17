-- El reglamento subido se ve con su nombre y su fecha (17/11/2026).
--
-- El cliente subió un PDF y «no se muestra correctamente visualizado»: la
-- pantalla pintaba el texto del reglamento por secciones (`contenido`), que
-- con un archivo subido está vacío, así que quedaba un título suelto y un
-- icono de descarga diminuto. Y del archivo no se sabía nada: en el depósito
-- se guarda con un nombre generado (para que dos «reglamento.pdf» no se
-- pisen), y el nombre con que se subió se perdía.
--
-- Solo aditiva:
--   · `archivo_nombre`: el nombre con que se subió, para enseñarlo;
--   · `archivo_subido_en`: cuándo se subió; la pone la base cada vez que
--     cambia el archivo, así la fecha no depende del reloj del celular;
--   · si una versión vieja de la app cambia el archivo sin mandar el nombre,
--     el nombre anterior se borra (sería el de otro archivo).

alter table public.reglamento
  add column if not exists archivo_nombre text,
  add column if not exists archivo_subido_en timestamptz;

comment on column public.reglamento.archivo_nombre is
  'El nombre con que se subió el archivo del reglamento (en el depósito va con un nombre generado). Lo enseña la app.';
comment on column public.reglamento.archivo_subido_en is
  'Cuándo se subió el archivo del reglamento. La pone el disparador reglamento_fecha_del_archivo al cambiar archivo_path.';

create or replace function public.reglamento_fecha_del_archivo()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.archivo_path is not null then
      new.archivo_subido_en := now();
    end if;
    return new;
  end if;

  if new.archivo_path is distinct from old.archivo_path then
    new.archivo_subido_en := case when new.archivo_path is null then null else now() end;
    -- Quien no mandó el nombre nuevo (una versión vieja de la app) no deja
    -- el del archivo anterior colgado del nuevo.
    if new.archivo_nombre is not distinct from old.archivo_nombre then
      new.archivo_nombre := null;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.reglamento_fecha_del_archivo() is
  'Disparador (17/11/2026): fecha el archivo del reglamento al subirse y borra el nombre viejo si el nuevo no lo trae.';

revoke all on function public.reglamento_fecha_del_archivo() from public, anon, authenticated;

drop trigger if exists reglamento_fecha_del_archivo on public.reglamento;
create trigger reglamento_fecha_del_archivo
  before insert or update of archivo_path on public.reglamento
  for each row execute function public.reglamento_fecha_del_archivo();

-- Los que ya tienen archivo: su última modificación es la mejor fecha que hay.
update public.reglamento
   set archivo_subido_en = updated_at
 where archivo_path is not null
   and archivo_subido_en is null;
