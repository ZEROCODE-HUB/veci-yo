-- ----------------------------------------------------------------------------
-- `id` era ambiguo
-- ----------------------------------------------------------------------------
-- `acompanantes_del_precheckin` quedo rota al ampliarla: devuelve una columna
-- llamada `id`, y dentro hace
--
--     select id into v_visita from public.visita where ...
--
-- En plpgsql los parametros de salida son **variables**, asi que ese `id` puede
-- ser la columna de `visita` o la columna del resultado. Postgres no elige:
-- responde «column reference "id" is ambiguous» y la funcion entera falla.
--
-- Lo delato la suite --dos casos de `huesped-precheckin-acompanantes`-- pero
-- costo mas de lo necesario llegar hasta aqui, porque esos casos hacen
--
--     const { data: lista } = await supabase.rpc(...)
--
-- **sin mirar el error**, asi que lo que se veia era «Cannot read properties of
-- null» y no el motivo. Se arregla tambien eso en la prueba.
--
-- La version anterior no llego a usarse en produccion: se creo hoy.

drop function if exists public.acompanantes_del_precheckin(text);

create function public.acompanantes_del_precheckin(p_token text)
returns table (
  id                 uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento_numero   text,
  correo             text,
  telefono           text,
  es_menor           boolean,
  terminos_aceptados boolean,
  tiene_enlace       boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  -- `v.id` y no `id`: el segundo es tambien el nombre de una columna del
  -- resultado, y Postgres no sabe a cual se refiere.
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
    (i.precheckin_token_hash is not null)
  from public.invitado i
  where i.visita_id = v_visita
    and not i.es_titular
  order by i.orden;
end;
$$;

comment on function public.acompanantes_del_precheckin is
  'Quien viene con el titular y en que estado esta cada uno. Incluye si acepto sus terminos y si ya se le emitio su enlace, que es lo que el titular necesita para saber a quien le falta.';

grant execute on function public.acompanantes_del_precheckin(text) to anon, authenticated;
