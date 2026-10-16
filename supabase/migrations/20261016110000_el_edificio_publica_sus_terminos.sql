-- ----------------------------------------------------------------------------
-- El edificio publica sus términos y condiciones (16/10/2026, Parametrización)
-- ----------------------------------------------------------------------------
-- `documento_legal` de tipo `terminos_condominio` es lo que acepta el huésped
-- en su preregistro (`legales_de_la_estancia`), y nadie lo podía cambiar desde
-- la aplicación: el edificio sembrado tenía unos de ejemplo, y uno nuevo
-- ninguno.
--
-- Se publica una versión nueva, no se corrige la vigente: `invitado` guarda
-- qué documento aceptó cada huésped (`terminos_documento_id`), y si se
-- reescribiera el texto, la constancia diría que aceptó algo que no leyó.
--
-- En una función y no en dos escrituras desde la app: el índice
-- `documento_legal_vigente_unico` admite una sola vigente por edificio, así
-- que hay que retirar la anterior y publicar la nueva a la vez.

create or replace function public.publicar_terminos_condominio(
  p_condominio_id uuid,
  p_titulo text,
  p_contenido text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version integer;
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración publica los términos del edificio'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_titulo), '') is null or nullif(btrim(p_contenido), '') is null then
    raise exception 'Faltan el título o el texto de los términos'
      using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.documento_legal
  where tipo = 'terminos_condominio' and condominio_id = p_condominio_id;

  update public.documento_legal
     set vigente = false
   where tipo = 'terminos_condominio'
     and condominio_id = p_condominio_id
     and vigente;

  insert into public.documento_legal (condominio_id, tipo, titulo, contenido, version, vigente)
  values (p_condominio_id, 'terminos_condominio', btrim(p_titulo), btrim(p_contenido), v_version, true);

  return v_version;
end;
$$;

comment on function public.publicar_terminos_condominio(uuid, text, text) is
  'Publica una versión nueva de los términos del edificio y retira la anterior, que queda como constancia de lo que aceptó cada huésped.';

revoke all on function public.publicar_terminos_condominio(uuid, text, text) from public, anon;
grant execute on function public.publicar_terminos_condominio(uuid, text, text) to authenticated;
