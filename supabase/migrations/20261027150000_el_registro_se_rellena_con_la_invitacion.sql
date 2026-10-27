-- ----------------------------------------------------------------------------
-- El registro se rellena con lo que ya dio la invitación (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 58 del GSheet. Quien crea la cuenta desde una invitación tenía que
-- volver a escribir su nombre, su documento y su teléfono, aunque los acababa
-- de dar (el huésped, en su preregistro). El cliente: «Rellenemos».
--
-- `datos_para_registrarse(token)` devuelve esos datos a quien tiene el enlace
-- de la invitación, que es la persona a la que se le mandó: los del huésped
-- si la invitación viene de una estancia (`invitado_id`), y si no, los que
-- escribió quien invitó. Solo con la invitación vigente. No devuelve nada que
-- no haya escrito esa misma persona o quien la invitó para ella. Solo aditiva.

create or replace function public.datos_para_registrarse(p_token text)
returns table(
  nombre text,
  apellido text,
  correo text,
  codigo_pais text,
  telefono text,
  tipo_documento text,
  documento text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    coalesce(nullif(trim(g.nombre), ''), i.nombre),
    nullif(trim(g.apellidos), ''),
    coalesce(nullif(trim(g.correo), ''), i.correo),
    coalesce(g.codigo_pais, i.codigo_pais),
    coalesce(nullif(trim(g.telefono), ''), i.telefono),
    g.tipo_documento::text,
    coalesce(nullif(trim(g.documento_numero), ''), i.documento)
  from public.invitacion i
  left join public.invitado g on g.id = i.invitado_id
  where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and i.estado = 'pendiente'
    and i.expira_en > now();
$function$;

comment on function public.datos_para_registrarse(text) is
  'Lo que ya se sabe de quien abre una invitación vigente, para rellenar su registro: los datos de su preregistro o los que escribió quien lo invitó. Hueco 58, 27/10/2026.';

grant execute on function public.datos_para_registrarse(text) to anon, authenticated, service_role;
