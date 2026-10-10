-- La lista de acompañantes dice si falta su documento
--
-- `acompanantes_del_precheckin` decía si cada uno aceptó sus términos y si ya
-- tiene su enlace, pero **no si subió la foto de su documento**. Así que el
-- titular veía «le falta aceptar sus términos» y nada sobre lo otro, que es
-- justo lo que la portería compara en la puerta y lo que el preregistro
-- también necesita.
--
-- Lo preguntó el cliente el 09/10/2026: «al registrar al otro adulto, igual
-- debería pedir fotos de sus documentos, ¿no? o generar el enlace para
-- enviarle a la otra persona y que él suba la foto».
--
-- Sí: lo segundo. Un adulto sube **su propio** documento desde su enlace —el
-- titular no puede aceptar términos por él, y la foto va junto con eso—. Lo
-- que faltaba era decirlo en la lista.
--
-- La ruta del archivo **no viaja**, solo si existe: con ella, quien tuviera el
-- enlace podría pedirle el archivo al Storage. Es la misma decisión que ya
-- toma `mi_ficha_precheckin` con el documento del titular.
--
-- Aditiva: reemplaza una función. Cambia el tipo de retorno, así que hay que
-- borrarla y crearla.

drop function if exists public.acompanantes_del_precheckin(text);

create function public.acompanantes_del_precheckin(p_token text)
returns table (
  id uuid,
  nombre text,
  apellidos text,
  tipo_documento text,
  documento_numero text,
  correo text,
  telefono text,
  es_menor boolean,
  terminos_aceptados boolean,
  tiene_enlace boolean,
  tiene_documento boolean,
  fecha_nacimiento date,
  responsable_id uuid,
  parentesco text,
  tiene_autorizacion boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.correo, i.telefono, i.es_menor, i.terminos_aceptados,
    (i.precheckin_token_hash is not null),
    -- Solo si existe, nunca la ruta.
    (vd.documento_original_path is not null),
    i.fecha_nacimiento, i.responsable_id, i.parentesco::text,
    exists (select 1 from public.autorizacion_menor a where a.invitado_id = i.id)
  from public.invitado i
  left join public.verificacion_documento vd on vd.invitado_id = i.id
  where i.visita_id = v_visita
    and not i.es_titular
  order by i.orden;
end;
$$;

comment on function public.acompanantes_del_precheckin(text) is
  'Los acompañantes de una estancia, con lo que le falta a cada uno: aceptar '
  'sus terminos, subir su documento y --si es menor-- su autorizacion. Desde '
  'el 09/10/2026 dice tambien lo del documento, que es lo que la porteria '
  'compara en la puerta.';

grant execute on function public.acompanantes_del_precheckin(text) to anon, authenticated;
