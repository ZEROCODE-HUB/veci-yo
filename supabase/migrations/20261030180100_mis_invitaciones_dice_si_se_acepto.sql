-- `mis_invitaciones_pendientes` dice también si la vivienda ya se aceptó, para
-- que la app sepa si toca aceptar la vivienda o solo los espacios
-- (30/10/2026). Cambia lo que devuelve, así que se vuelve a crear. Solo
-- aditiva.

drop function if exists public.mis_invitaciones_pendientes();

create function public.mis_invitaciones_pendientes()
 returns table(
   invitacion_id uuid, unidad text, torre integer, edificio text, invitada_por text,
   terminos text, espacios jsonb, aceptada boolean
 )
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
  select i.id, u.codigo, t.numero::int, c.nombre,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         (select cp.valor from public.configuracion_plataforma cp where cp.clave = 'terminos_propiedad'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', ie.id,
                    'estado', ie.estado,
                    'tipo', case when ie.estacionamiento_id is not null then 'estacionamiento' else 'deposito' end,
                    'codigo', coalesce(e.codigo, d.codigo),
                    'ubicacion', coalesce(e.ubicacion, d.ubicacion),
                    'terminos', (select cp.valor from public.configuracion_plataforma cp
                                  where cp.clave = case when ie.estacionamiento_id is not null
                                                        then 'terminos_estacionamiento'
                                                        else 'terminos_deposito' end)
                  ) order by ie.created_at)
             from public.invitacion_espacio ie
             left join public.estacionamiento e on e.id = ie.estacionamiento_id
             left join public.deposito d on d.id = ie.deposito_id
            where ie.invitacion_id = i.id
         ), '[]'::jsonb),
         i.estado = 'aceptada'
  from public.invitacion i
  join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
  join public.unidad u on u.id = i.unidad_id and u.deleted_at is null
  join public.torre t on t.id = u.torre_id
  join public.condominio c on c.id = i.condominio_id
  left join public.perfil p on p.id = i.invitada_por
  where lower(i.correo) = lower(yo.email)
    and i.ambito = 'unidad' and i.rol_unidad = 'propietario'
    and i.expira_en > now()
    and (
      i.estado = 'pendiente'
      -- Aceptada pero con espacios por resolver: sigue saliendo.
      or (i.estado = 'aceptada' and i.aceptada_por = auth.uid() and exists (
            select 1 from public.invitacion_espacio ie
             where ie.invitacion_id = i.id and ie.estado = 'pendiente'))
    )
  order by i.created_at;
$function$;

comment on function public.mis_invitaciones_pendientes() is
  'Las invitaciones de propietario de quien pregunta (por su correo confirmado), con sus términos, sus estacionamientos y depósitos, y si ya aceptó la vivienda (30/10/2026).';

revoke execute on function public.mis_invitaciones_pendientes() from public, anon;
grant execute on function public.mis_invitaciones_pendientes() to authenticated, service_role;
