-- El recordatorio «avisarme a mi» le llega a quien responde por la estancia
-- (17/10/2026), no siempre al propietario mas antiguo.

CREATE OR REPLACE FUNCTION public.precheckins_por_recordar()
 RETURNS TABLE(visita_id uuid, dias_antes smallint, destinatario text, correo text, nombre text, condominio text, nombre_huesped text, fecha_desde date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with pendientes as (
    select
      v.id,
      v.fecha_desde,
      v.condominio_id,
      v.unidad_id,
      v.registrada_por,
      (v.fecha_desde - current_date)::smallint as faltan,
      s.recordatorio_al_huesped,
      s.recordatorio_al_anfitrion,
      s.recordatorio_dias,
      t.nombre   as titular_nombre,
      t.correo   as titular_correo
    from public.visita v
    join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    where v.tipo = 'huesped_temporal'
      -- Solo las que tienen enlace abierto y sin cerrar. Una estancia sin
      -- preregistro abierto no tiene nada que recordar.
      and v.precheckin_token_hash is not null
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde >= current_date
      and (v.fecha_desde - current_date)::smallint = any (s.recordatorio_dias)
  )
  -- Al huesped, si el anfitrion lo dejo encendido y hay a donde escribirle.
  select
    p.id, p.faltan, 'huesped'::text, p.titular_correo, p.titular_nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  where p.recordatorio_al_huesped
    and coalesce(btrim(p.titular_correo), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'huesped'
    )

  union all

  -- Y al anfitrion, que es quien responde por la estancia. Su correo sale de su
  -- perfil, no de la membresia: el perfil es donde la persona lo mantiene.
  select
    p.id, p.faltan, 'anfitrion'::text, u.email, pf.nombre,
    c.nombre, p.titular_nombre, p.fecha_desde
  from pendientes p
  join public.condominio c on c.id = p.condominio_id
  -- Quien responde por la estancia: el anfitrion primario de la vivienda; si
  -- no hay, quien la registro; y si no, el propietario mas antiguo. Hasta el
  -- 17/10/2026 era siempre el propietario mas antiguo, asi que si la
  -- anfitriona era una inquilina lider, el aviso le llegaba a otra persona.
  join lateral (
    select m.usuario_id
    from public.membresia_unidad m
    where m.unidad_id = p.unidad_id
      and m.activo
      and m.usuario_id is not null
      and m.rol in ('propietario', 'inquilino_lider', 'coadministrador')
    order by m.es_anfitrion_primario desc,
             (m.usuario_id = p.registrada_por) desc nulls last,
             (m.rol = 'propietario') desc,
             m.created_at
    limit 1
  ) duenio on true
  join auth.users u on u.id = duenio.usuario_id
  left join public.perfil pf on pf.id = duenio.usuario_id
  where p.recordatorio_al_anfitrion
    and coalesce(btrim(u.email), '') <> ''
    and not exists (
      select 1 from public.recordatorio_precheckin r
      where r.visita_id = p.id and r.dias_antes = p.faltan
        and r.destinatario = 'anfitrion'
    );
$function$;
