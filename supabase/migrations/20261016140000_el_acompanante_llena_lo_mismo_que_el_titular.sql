-- ============================================================================
-- El acompañante llena lo mismo que el titular
-- ============================================================================
-- La responsable de producto (16/10/2026): «todos los mismos campos del
-- preregistro, motivo, dirección, misma pantalla», y las fotos del documento
-- obligatorias, como el titular.
--
-- `guardar_mi_ficha_acompanante` no recibe dirección ni motivo. Añadirle
-- argumentos obligaría a borrarla y crearla (cambia la firma) y la llaman la
-- web y las pruebas: va aparte, en una función pequeña con el mismo enlace.
-- Y para exigir las fotos la pantalla tiene que saber si ya están.

create or replace function public.guardar_direccion_y_motivo_acompanante(
  p_token     text,
  p_direccion text default null,
  p_motivo    public.motivo_estancia default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_cerrado boolean;
begin
  select i.id, (v.precheckin_completado_en is not null)
    into v_id, v_cerrado
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  if v_cerrado then
    raise exception 'Este preregistro ya se cerro: pideselo a quien reservo';
  end if;

  update public.invitado
     set direccion = nullif(btrim(coalesce(p_direccion, '')), ''),
         motivo    = coalesce(p_motivo, motivo)
   where id = v_id;
end;
$$;

comment on function public.guardar_direccion_y_motivo_acompanante(text, text, public.motivo_estancia) is
  'El acompanante escribe su direccion y el motivo de la estancia con su '
  'propio enlace (16/10/2026), igual que el titular en guardar_precheckin.';

grant execute on function public.guardar_direccion_y_motivo_acompanante(text, text, public.motivo_estancia)
  to anon, authenticated;


create or replace function public.fotos_de_mi_documento(p_token text)
returns table (frente boolean, reverso boolean, direccion text, motivo text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(vd.documento_original_path is not null, false),
    coalesce(vd.documento_reverso_path is not null, false),
    i.direccion,
    i.motivo::text
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  left join public.verificacion_documento vd on vd.invitado_id = i.id
  where i.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
  limit 1;
$$;

comment on function public.fotos_de_mi_documento(text) is
  'Con el enlace de un acompanante: si ya subio las dos caras de su documento '
  '(las rutas no viajan) y la direccion y el motivo que ya hubiera puesto.';

grant execute on function public.fotos_de_mi_documento(text) to anon, authenticated;
