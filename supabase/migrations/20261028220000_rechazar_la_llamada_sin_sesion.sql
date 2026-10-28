-- «Rechazar» una llamada con la app cerrada (28/10/2026).
--
-- El código de Android no tiene sesión; la función `rechazar-llamada`
-- comprueba la firma del aviso y llama aquí con la clave de servicio, diciendo
-- quién rechaza. Es `rechazar_llamada` con la persona como argumento en vez de
-- `auth.uid()`, y por eso solo la puede llamar el servicio. Solo aditiva.

create or replace function public.rechazar_llamada_de(p_llamada_id uuid, p_usuario_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null
     or l.de_usuario_id = p_usuario_id
     or not public.le_suena_la_llamada(p_usuario_id, l.destino, l.origen, l.condominio_id, l.a_unidad_id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado <> 'sonando' then
    return false;
  end if;
  update public.llamada_internet
     set estado = 'rechazada', terminada_en = now()
   where id = l.id;
  return true;
end;
$function$;

comment on function public.rechazar_llamada_de(uuid, uuid) is
  'Rechaza una llamada que suena, en nombre de esa persona. Interna: la usa la función rechazar-llamada, que antes comprueba la firma del aviso. Devuelve si la rechazó (falso si ya no sonaba).';

revoke execute on function public.rechazar_llamada_de(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rechazar_llamada_de(uuid, uuid) to service_role;
