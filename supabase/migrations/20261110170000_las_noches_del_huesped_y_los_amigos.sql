-- Las noches del huésped y las visitas de amigos, con una sola regla
-- (10/11/2026, decidido con el cliente).
--
-- 1. Qué días son del huésped: del día que llega al día antes de su salida,
--    las noches que duerme. Es lo que ya tachaba el calendario de reservas. El
--    día de salida se va a la hora del check-out y la vivienda vuelve a ser del
--    dueño. `huesped_alojado_hasta` contaba también el día de salida: la
--    pantalla dejaba elegirlo y la base lo rechazaba.
-- 2. `visitas_de_amigos_en`: las visitas de amigos o familia por venir que caen
--    en unas fechas, para que la pantalla de la reserva avise al crearla o al
--    moverla y deje cancelarlas ahí mismo.
-- 3. Si la reserva llega sola, del calendario de una plataforma, no hay
--    pantalla que avise: se le manda un aviso al anfitrión.
-- Solo aditiva.

create or replace function public.huesped_alojado_hasta(p_unidad_id uuid, p_fecha date)
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select max(v.fecha_hasta)
    from public.visita v
   where v.unidad_id = p_unidad_id
     and v.tipo = 'huesped_temporal'
     and v.deleted_at is null
     and v.estado in ('programada', 'ingresada')
     -- Las noches: desde la llegada hasta el día antes de la salida.
     and p_fecha >= v.fecha_desde
     and p_fecha < coalesce(v.fecha_hasta, v.fecha_desde + 1)
     and (
       auth.uid() is null
       or exists (select 1 from public.membresia_unidad m
                   where m.unidad_id = p_unidad_id and m.usuario_id = auth.uid() and m.activo)
       or public.es_admin_condominio(v.condominio_id)
       or public.es_personal_condominio(v.condominio_id)
     );
$$;

-- Las visitas de amigos o familia por venir en esas noches (de `p_desde` al
-- día antes de `p_hasta`). Responde a quien gestiona la vivienda o trabaja en
-- el edificio; a cualquier otro, nada.
create or replace function public.visitas_de_amigos_en(p_unidad_id uuid, p_desde date, p_hasta date)
returns table (visita_id uuid, fecha date, nombre text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.id, v.fecha_desde,
         coalesce((select i.nombre from public.invitado i
                    where i.visita_id = v.id order by i.es_titular desc, i.orden limit 1), 'Sin nombre')
    from public.visita v
   where v.unidad_id = p_unidad_id
     and v.tipo = 'amigos'
     and v.deleted_at is null
     and v.estado = 'programada'
     and v.fecha_desde >= p_desde
     and v.fecha_desde < coalesce(p_hasta, p_desde + 1)
     and (
       auth.uid() is null
       or exists (select 1 from public.membresia_unidad m
                   where m.unidad_id = p_unidad_id and m.usuario_id = auth.uid()
                     and m.activo and m.rol <> 'huesped_temporal')
       or public.es_admin_condominio(v.condominio_id)
       or public.es_personal_condominio(v.condominio_id)
     )
   order by v.fecha_desde;
$$;

revoke execute on function public.visitas_de_amigos_en(uuid, date, date) from public, anon;
grant execute on function public.visitas_de_amigos_en(uuid, date, date) to authenticated, service_role;
comment on function public.visitas_de_amigos_en(uuid, date, date) is
  'Visitas de amigos o familia por venir en las noches de una estancia (10/11/2026).';

-- 3. La reserva que llega del calendario avisa al anfitrión si pisa amigos.
create or replace function public.avisar_amigos_en_la_estancia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cuantas int;
  v_dias text;
  v_anfitrion uuid;
begin
  if new.tipo <> 'huesped_temporal' or new.origen <> 'calendario' or new.deleted_at is not null
     or new.fecha_desde is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.fecha_desde is not distinct from new.fecha_desde
     and old.fecha_hasta is not distinct from new.fecha_hasta then
    return new;
  end if;

  select count(*), string_agg(distinct to_char(a.fecha, 'DD/MM'), ', ')
    into v_cuantas, v_dias
    from public.visitas_de_amigos_en(new.unidad_id, new.fecha_desde, new.fecha_hasta) a;
  if v_cuantas = 0 then
    return new;
  end if;

  for v_anfitrion in
    select distinct m.usuario_id from public.membresia_unidad m
     where m.unidad_id = new.unidad_id and m.activo and m.usuario_id is not null
       and (m.es_anfitrion_primario or m.rol = 'propietario')
  loop
    if public.quiere_aviso(v_anfitrion, 'visitas_en_la_estancia', 'app') then
      insert into public.notificacion
        (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
      values
        (v_anfitrion, new.condominio_id, 'visitas_en_la_estancia',
         'Una reserva pisa visitas de amigos',
         format('La reserva del %s al %s coincide con %s anunciada%s (%s). Revísala en Visitas y cancélala si hace falta.',
           to_char(new.fecha_desde, 'DD/MM'), to_char(new.fecha_hasta, 'DD/MM'),
           case when v_cuantas = 1 then '1 visita de amigos o familia' else v_cuantas || ' visitas de amigos o familia' end,
           case when v_cuantas = 1 then '' else 's' end, v_dias),
         'visita', new.id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists visita_avisa_amigos_en_la_estancia on public.visita;
create trigger visita_avisa_amigos_en_la_estancia
  after insert or update of fecha_desde, fecha_hasta on public.visita
  for each row execute function public.avisar_amigos_en_la_estancia();
