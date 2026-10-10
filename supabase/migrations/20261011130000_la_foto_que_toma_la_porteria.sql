-- Lo que la funcion `subir-documento-porteria` necesita saber antes de guardar
-- la foto que el guardia toma en la puerta.
--
-- Aditiva: una funcion nueva.
--
-- La foto la estampa y la sube una funcion de servidor, con la clave de
-- servicio. Antes tiene que saber, **con la sesion de quien llama**, si esa
-- persona es guardia de ese edificio y si tiene a ese huesped en su lista. Eso
-- lo responde esta funcion, y de paso devuelve lo que va escrito en la marca
-- de agua, para que la funcion de servidor no lo lea con permisos de mas.

create or replace function public.datos_para_foto_de_porteria(p_invitado_id uuid)
returns table (
  visita_id    uuid,
  guardia      text,
  condominio   text,
  zona_horaria text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita     uuid;
  v_condominio uuid;
begin
  select v.id, v.condominio_id into v_visita, v_condominio
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  -- El mismo mensaje para «no existe» y «no te toca», igual que al verificar.
  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  return query
  select
    v_visita,
    nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
    c.nombre,
    public.zona_horaria_del_condominio(v_condominio)
  from public.condominio c
  left join public.perfil p on p.id = auth.uid()
  where c.id = v_condominio;
end;
$$;

comment on function public.datos_para_foto_de_porteria(uuid) is
  'Comprueba que quien llama es guardia y tiene a ese huesped en su lista, y '
  'devuelve lo que va escrito en la marca de agua de la foto que toma.';

revoke execute on function public.datos_para_foto_de_porteria(uuid) from public, anon;
grant execute on function public.datos_para_foto_de_porteria(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
