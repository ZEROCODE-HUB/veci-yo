-- En el chat, quien trabaja en el edificio firma con su nombre aunque además
-- viva en él (hueco 21).
--
-- El 26/10/2026 el chat empezó a firmar al vecino con su alias. Marcela
-- administra el edificio y es propietaria de la 301: su respuesta como
-- administración salió firmada «VecinaDel301». El personal --administración,
-- coadministración, portería-- habla por su cargo, así que no lleva alias.
--
-- Solo aditiva: el cuerpo de una función.

create or replace function public.mensaje_con_el_depto_del_autor()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_alias text;
begin
  select c.condominio_id into v_condominio
  from public.conversacion c
  where c.id = new.conversacion_id;

  -- Sin `if new.autor_unidad is null`: se pisa siempre. Lo que manda el
  -- cliente no cuenta.
  new.autor_unidad := public.viviendas_de_en(new.autor_id, v_condominio);

  -- El vecino firma con su alias, si lo tiene; el personal, con su nombre.
  if new.autor_unidad is not null
     and not exists (select 1 from public.membresia_condominio mc
                      where mc.condominio_id = v_condominio
                        and mc.usuario_id = new.autor_id and mc.activo) then
    select nullif(btrim(p.alias), '') into v_alias from public.perfil p where p.id = new.autor_id;
    if v_alias is not null then
      new.autor_nombre := v_alias;
    end if;
  end if;

  return new;
end;
$$;
