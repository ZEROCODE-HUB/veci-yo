-- ============================================================================
-- El enlace del huésped dice también el máximo de personas del edificio
-- ============================================================================
-- La responsable de producto (16/10/2026): junto a «Cantidad de huéspedes», entre
-- paréntesis, el máximo que fijó el anfitrión y, si no fijó ninguno, el del
-- edificio. El del edificio vive en `limite_renta_corta_condominio`.
--
-- Cambia las columnas que devuelve, así que hay que borrarla y crearla (lo
-- mismo que se hizo el 09/10/2026). No se borra ningún dato.

drop function if exists public.consultar_precheckin(text);

create function public.consultar_precheckin(p_token text)
returns table (
  visita_id uuid,
  condominio text,
  unidad text,
  anfitrion text,
  fecha_desde date,
  fecha_hasta date,
  max_huespedes integer,
  huespedes_previstos integer,
  menores_previstos integer,
  personas_ya int,
  vigente boolean,
  completado boolean,
  max_huespedes_edificio integer
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    v.id,
    c.nombre,
    u.codigo,
    split_part(coalesce(p.nombre, ''), ' ', 1),
    v.fecha_desde,
    v.fecha_hasta,
    s.max_huespedes,
    v.huespedes_previstos,
    v.menores_previstos,
    (select count(*)::int from public.invitado i where i.visita_id = v.id),
    (v.precheckin_expira_en > now()),
    (v.precheckin_completado_en is not null),
    l.capacidad_maxima
  from public.visita v
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  left join public.limite_renta_corta_condominio l on l.condominio_id = v.condominio_id
  left join public.membresia_unidad m
         on m.unidad_id = v.unidad_id and m.rol = 'propietario' and m.activo
  left join public.perfil p on p.id = m.usuario_id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

comment on function public.consultar_precheckin(text) is
  'Lo que se puede saber de una estancia **antes** de identificarse, con el '
  'token del enlace. Desde el 16/10/2026 dice tambien el maximo de personas '
  'del edificio, para cuando el anfitrion no fijo el suyo.';

grant execute on function public.consultar_precheckin(text) to anon, authenticated;
