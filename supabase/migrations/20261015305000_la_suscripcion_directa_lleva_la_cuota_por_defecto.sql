-- La suscripción creada desde la API lleva la cuota por defecto (15/10/2026).
--
-- `20261015300000` rechazaba crear una suscripción desde la API: la app la
-- crea con `activar_suscripcion_renta_corta`. Pero las pruebas de permisos y
-- de límites --y cualquier herramienta que se apoye en la política de alta--
-- la crean directamente, y lo que había que impedir no era crearla sino
-- **regalarse cuota**. Así que ahora se crea, y la base ignora la cuota y la
-- verificación que vengan y pone las suyas: el valor por defecto de la
-- columna, leído del catálogo para no repetir el número aquí.

create or replace function public.cuota_de_suscripcion_solo_por_su_funcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_defecto text;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    select pg_get_expr(d.adbin, d.adrelid) into v_defecto
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    where d.adrelid = 'public.suscripcion_renta_corta'::regclass
      and a.attname = 'verificaciones_base';
    execute 'select (' || v_defecto || ')::integer' into new.verificaciones_base;
    new.verificada_en := null;
    new.verificada_por := null;
    return new;
  end if;
  if (new.verificaciones_base, new.verificada_en, new.verificada_por)
     is distinct from (old.verificaciones_base, old.verificada_en, old.verificada_por) then
    raise exception 'La cuota de verificaciones no se cambia a mano'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
