-- ============================================================================
-- Gratitud: entre residentes, y uno cada 30 días
-- ============================================================================
-- La responsable de producto (16/10/2026):
--   · «Solo reconocimientos entre residentes. Es solo para convivencia entre
--     vecinos.» Hasta hoy podía recibir cualquiera con membresía de
--     condominio --la portería, la administración-- y daba cualquiera.
--   · «Ese cuadro en Home aparece después de 30 días de haber dado un
--     reconocimiento», y en gris «en X días podrás dar un nuevo
--     reconocimiento». La regla era uno por mes de calendario: quien daba el 31
--     podía volver a dar el 1. Ahora son 30 días desde el último.
--   · Insignias: «Reciclador» pasa a «Amigable con el medio ambiente» y
--     «Puntual» a una huellita, «Mascotalover». Se cambian la etiqueta y el
--     icono; la clave se queda para no tocar lo ya otorgado.
--
-- No se borra nada: los reconocimientos que ya hay se quedan como están.

-- 1. Quién es residente ------------------------------------------------------

create or replace function public.es_residente_del_condominio(
  p_usuario_id uuid,
  p_condominio_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = p_usuario_id
      and mu.activo
      and mu.es_residente
      and mu.rol <> 'huesped_temporal'
  );
$$;

comment on function public.es_residente_del_condominio(uuid, uuid) is
  'Si esa persona vive en el edificio: una vivienda activa donde reside y no '
  'como huesped. La portería y la administración, por su cargo, no cuentan.';

revoke all on function public.es_residente_del_condominio(uuid, uuid) from public;
grant execute on function public.es_residente_del_condominio(uuid, uuid) to authenticated, service_role;


-- 2. Cuántos días le faltan para poder dar otro --------------------------------

create or replace function public.dias_para_dar_reconocimiento(p_condominio_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    coalesce(
      30 - floor(extract(epoch from (now() - max(r.otorgado_en))) / 86400)::int,
      0
    )
  )
  from public.reconocimiento r
  where r.otorgado_por = auth.uid()
    and r.condominio_id = p_condominio_id;
$$;

comment on function public.dias_para_dar_reconocimiento(uuid) is
  'Cuantos dias le faltan a quien pregunta para poder dar otro reconocimiento '
  'en ese edificio. 0 si ya puede. Cuenta 30 dias desde el ultimo.';

grant execute on function public.dias_para_dar_reconocimiento(uuid) to authenticated;


-- 3. La regla, en el disparador -------------------------------------------------

create or replace function public.reconocimiento_con_medida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_ultimo timestamptz;
begin
  if not public.es_residente_del_condominio(new.usuario_id, new.condominio_id) then
    raise exception
      'Solo se reconoce a quien vive en el edificio. La gratitud es entre vecinos.';
  end if;

  if not public.es_residente_del_condominio(new.otorgado_por, new.condominio_id) then
    raise exception
      'Solo los residentes dan reconocimientos. La gratitud es entre vecinos.';
  end if;

  select max(r.otorgado_en) into v_ultimo
  from public.reconocimiento r
  where r.otorgado_por = new.otorgado_por
    and r.condominio_id = new.condominio_id
    and r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_ultimo is not null
     and coalesce(new.otorgado_en, now()) < v_ultimo + interval '30 days' then
    raise exception
      'Ya diste un reconocimiento. Podras dar otro 30 dias despues del ultimo: es uno cada vez, y por eso vale.';
  end if;

  return new;
end;
$fn$;

comment on function public.reconocimiento_con_medida() is
  'Uno cada 30 dias por persona y edificio, y solo entre residentes '
  '(16/10/2026). Va en disparador: en la base hay casos antiguos que no cumplirian.';


-- 4. Las dos insignias que cambian de nombre -------------------------------------

update public.insignia
   set etiqueta = 'Amigable con el medio ambiente'
 where clave = 'reciclador';

update public.insignia
   set etiqueta = 'Mascotalover', icono = '🐾'
 where clave = 'puntual';
