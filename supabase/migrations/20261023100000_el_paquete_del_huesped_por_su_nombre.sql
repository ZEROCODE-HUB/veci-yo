-- ----------------------------------------------------------------------------
-- El paquete del huésped, también con solo su nombre (23/10/2026)
-- ----------------------------------------------------------------------------
-- QA (Tests T-086, 22/10/2026): la portería registró un paquete «para Tomas» y
-- a Tomás no le llegó el aviso ni lo vio en «Mi alojamiento». La base pedía el
-- nombre completo **exacto**, y en su ficha dice «Tomas Huesped Huesped»: con
-- el nombre de pila, o sin la tilde, no coincidía nunca. En la portería se
-- escribe lo que trae la etiqueta, que casi nunca es el nombre entero.
--
-- Ahora basta con que **todas las palabras escritas** estén en el nombre del
-- huésped, sin mayúsculas ni tildes. Y como «Tomas» a secas puede ser de más de
-- uno, por nombre solo vale si coincide **un único** huésped alojado hoy; si
-- son dos, el paquete se queda como de la vivienda (lo ve el propietario), que
-- es lo que pasaba antes. El documento sigue mandando cuando se anota.

create or replace function public.palabras_sin_tildes(p_texto text)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select coalesce(
    regexp_split_to_array(
      btrim(translate(lower(coalesce(p_texto, '')), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun')),
      '\s+'),
    '{}')
  where btrim(coalesce(p_texto, '')) <> ''
$fn$;

comment on function public.palabras_sin_tildes(text) is
  'Las palabras de un nombre en minúscula y sin tildes, para comparar lo que escribe la portería con la ficha de un huésped. Null si el texto está vacío.';

revoke all on function public.palabras_sin_tildes(text) from public, anon, authenticated;
grant execute on function public.palabras_sin_tildes(text) to service_role;

create or replace function public.huesped_destinatario(
  p_unidad_id uuid,
  p_nombre    text,
  p_documento text
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with alojados as (
    select distinct on (i.usuario_id)
      i.usuario_id, i.documento_numero, i.nombre, i.apellidos, v.fecha_desde
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    join public.membresia_unidad mu
      on mu.usuario_id = i.usuario_id and mu.unidad_id = v.unidad_id
    where v.unidad_id = p_unidad_id
      and i.usuario_id is not null
      and mu.rol = 'huesped_temporal'
      and mu.activo
      and (mu.vigente_desde is null or mu.vigente_desde <= current_date)
      and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date)
    order by i.usuario_id, v.fecha_desde desc nulls last
  ),
  por_documento as (
    -- El documento, comparando solo los dígitos: «1.098.765» y «1098765».
    select a.usuario_id
    from alojados a
    where nullif(regexp_replace(coalesce(p_documento, ''), '\D', '', 'g'), '') is not null
      and regexp_replace(coalesce(a.documento_numero, ''), '\D', '', 'g')
          = regexp_replace(p_documento, '\D', '', 'g')
    order by a.fecha_desde desc nulls last
    limit 1
  ),
  por_nombre as (
    -- Cada palabra escrita está en su nombre. `<@`: contenido en.
    select a.usuario_id
    from alojados a
    where public.palabras_sin_tildes(p_nombre) is not null
      and public.palabras_sin_tildes(p_nombre)
          <@ public.palabras_sin_tildes(a.nombre || ' ' || coalesce(a.apellidos, ''))
  )
  select coalesce(
    (select usuario_id from por_documento),
    -- Por nombre, solo si no hay duda de quién es.
    (select min(usuario_id::text)::uuid from por_nombre
     having count(*) = 1)
  );
$fn$;

comment on function public.huesped_destinatario(uuid, text, text) is
  'El huésped alojado hoy en la vivienda al que va un paquete: por documento (solo dígitos) o, si no, por nombre --todas las palabras escritas están en su nombre, sin tildes-- cuando coincide uno solo. Null si no hay o hay duda.';
