-- ----------------------------------------------------------------------------
-- La llamada a portería siempre tiene quien conteste (15/10/2026, hueco 16)
-- ----------------------------------------------------------------------------
-- Las llamadas por internet a portería suenan solo a los guardias con permiso
-- de llamadas. Si la administración no se lo dio a ninguno, la llamada sonaba
-- en el vacío: no la contestaba nadie, no pasaba a nadie más, y si quien
-- llamaba cerraba la app, se quedaba «sonando» para siempre.
--
-- Tres cambios:
--
-- 1. Sin ningún guardia con permiso de llamadas, la llamada a portería suena
--    a la administración del edificio. Es lo mismo que ya hace el S.O.S.: no
--    llegarle a nadie no es una opción.
-- 2. Una llamada que nadie contesta en un minuto pasa a «perdida». Lo hace una
--    pasada cada minuto, para las que se quedan sonando porque quien llamaba
--    cerró la app.
-- 3. Una llamada a portería perdida avisa a quien la tenía que contestar,
--    con la vivienda que llamó.

create or replace function public.porteria_sin_quien_conteste(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select not exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.rol = 'guardia'
      and mc.activo
      and (mc.permisos ->> 'llamadas') = 'true'
  );
$fn$;

comment on function public.porteria_sin_quien_conteste(uuid) is
  'Si ningún guardia activo del edificio tiene permiso de llamadas. Entonces la llamada a portería suena a la administración (hueco 16).';

revoke all on function public.porteria_sin_quien_conteste(uuid) from public;
grant execute on function public.porteria_sin_quien_conteste(uuid) to authenticated;

create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or (l.destino = 'porteria' and (
              public.porteria_puede_llamar(l.condominio_id)
              -- Sin nadie en portería que pueda contestar, la administración.
              or (public.porteria_sin_quien_conteste(l.condominio_id)
                  and public.es_admin_condominio(l.condominio_id))))
        or (l.destino = 'vivienda' and (public.es_miembro_unidad(l.a_unidad_id)
                                        or public.es_huesped_alojado(l.a_unidad_id)))
      )
  );
$function$;

-- ----------------------------------------------------------------------------
-- La que nadie contesta, perdida
-- ----------------------------------------------------------------------------

create or replace function public.llamadas_sin_contestar()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $fn$
  with perdidas as (
    update public.llamada_internet
       set estado = 'perdida', terminada_en = now()
     where estado = 'sonando'
       and created_at < now() - interval '1 minute'
    returning 1
  )
  select count(*)::integer from perdidas;
$fn$;

comment on function public.llamadas_sin_contestar() is
  'Pasa a «perdida» toda llamada que lleva más de un minuto sonando. La corre el cron cada minuto. Interna.';

revoke execute on function public.llamadas_sin_contestar() from public, anon, authenticated;
grant execute on function public.llamadas_sin_contestar() to service_role;

select cron.unschedule('llamadas-sin-contestar')
where exists (select 1 from cron.job where jobname = 'llamadas-sin-contestar');
select cron.schedule(
  'llamadas-sin-contestar',
  '* * * * *',
  $cron$ select public.llamadas_sin_contestar(); $cron$
);

-- ----------------------------------------------------------------------------
-- Y la perdida avisa
-- ----------------------------------------------------------------------------

create or replace function public.avisar_llamada_perdida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_vivienda text;
begin
  if new.destino <> 'porteria' then
    return new;
  end if;

  select u.codigo into v_vivienda from public.unidad u where u.id = new.de_unidad_id;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct mc.usuario_id, new.condominio_id, 'llamada_perdida'::public.motivo_notificacion,
         'Llamada perdida',
         'Llamaron a portería' || coalesce(' desde la vivienda ' || v_vivienda, '')
           || ' y nadie contestó.',
         'llamada_internet', new.id
  from public.membresia_condominio mc
  where mc.condominio_id = new.condominio_id
    and mc.activo
    and mc.usuario_id is not null
    and mc.usuario_id <> new.de_usuario_id
    and (
      (mc.rol = 'guardia' and (mc.permisos ->> 'llamadas') = 'true')
      or (mc.rol in ('administrador', 'coadministrador')
          and public.porteria_sin_quien_conteste(new.condominio_id))
    )
    and public.quiere_aviso(mc.usuario_id, 'llamada_perdida', 'app');

  return new;
end;
$fn$;

revoke all on function public.avisar_llamada_perdida() from public;

drop trigger if exists llamada_internet_perdida on public.llamada_internet;
create trigger llamada_internet_perdida
  after update of estado on public.llamada_internet
  for each row
  when (new.estado = 'perdida' and old.estado is distinct from 'perdida')
  execute function public.avisar_llamada_perdida();
