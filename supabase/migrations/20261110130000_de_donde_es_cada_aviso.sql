-- De dónde es cada aviso (10/11/2026, pedido del cliente).
--
-- La bandeja es de la persona, no del rol (así se decidió), y una misma
-- persona puede ser administradora del edificio y propietaria del 102. El
-- aviso «Tu visita ingresó» era del 102 y le llegaba entrando como
-- administración, sin decir de qué vivienda era; al tocarlo la llevaba a la
-- lista de visitas de la administración.
--
-- Esta función dice, para cada aviso de quien pregunta, a qué vivienda suya
-- pertenece (solo si es miembro de esa vivienda) o si es de su trabajo en el
-- edificio (administración o portería). La aplicación lo pinta en el aviso y,
-- si hace falta, pregunta antes de cambiar de rol. Solo aditiva: no toca la
-- tabla ni los avisos.

create or replace function public.de_donde_son_mis_avisos(p_ids uuid[])
returns table (notificacion_id uuid, unidad_id uuid, de_la_administracion boolean, de_la_porteria boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with mios as (
    select n.id, n.tipo::text as tipo, n.entidad_tipo, n.entidad_id
      from public.notificacion n
     where n.id = any (p_ids) and n.usuario_id = auth.uid()
  ),
  con_vivienda as (
    select m.id, m.tipo,
           case m.entidad_tipo
             when 'visita' then (select v.unidad_id from public.visita v where v.id = m.entidad_id)
             when 'reserva_zona' then (select r.unidad_id from public.reserva_zona r where r.id = m.entidad_id)
             when 'correspondencia' then (select c.unidad_id from public.correspondencia c where c.id = m.entidad_id)
             when 'conversacion' then (select c.unidad_id from public.conversacion c where c.id = m.entidad_id)
             when 'reclamo' then (select r.unidad_id from public.reclamo r where r.id = m.entidad_id)
             when 'llamada_internet' then (select l.a_unidad_id from public.llamada_internet l where l.id = m.entidad_id)
           end as unidad_id
      from mios m
  )
  select cv.id,
         -- La vivienda solo si quien pregunta es de ella: si no, el aviso le
         -- llegó por su trabajo en el edificio.
         case when cv.tipo not in ('reserva_por_aprobar', 'reclamo_nuevo', 'prorroga_solicitada', 'prorroga_respondida')
                and exists (
                  select 1 from public.membresia_unidad mu
                   where mu.unidad_id = cv.unidad_id and mu.usuario_id = auth.uid() and mu.activo)
              then cv.unidad_id end,
         cv.tipo in ('reserva_por_aprobar', 'reclamo_nuevo', 'prorroga_solicitada'),
         cv.tipo = 'prorroga_respondida'
    from con_vivienda cv;
$$;

revoke execute on function public.de_donde_son_mis_avisos(uuid[]) from public, anon;
grant execute on function public.de_donde_son_mis_avisos(uuid[]) to authenticated, service_role;

comment on function public.de_donde_son_mis_avisos(uuid[]) is
  'Para cada aviso propio: la vivienda de quien pregunta a la que pertenece, o si es de la administración o de la portería (10/11/2026).';
