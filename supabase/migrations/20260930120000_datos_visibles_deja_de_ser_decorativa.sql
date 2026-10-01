-- ----------------------------------------------------------------------------
-- «Datos visibles» empieza a significar algo
-- ----------------------------------------------------------------------------
-- Cada residente de una vivienda tiene un interruptor --`membresia_unidad.
-- datos_visibles`-- que dice si sus datos se ven o se ocultan, y la pantalla lo
-- respeta: pone «👁️ Datos visibles» o «🔒 Datos ocultos» en su tarjeta.
--
-- Pero `perfil_lectura_propia` dejaba leer **un solo perfil: el tuyo**, sin
-- excepciones. Asi que daba igual como estuviera el interruptor: nadie veia la
-- cedula ni el telefono de nadie, nunca. Entrando como Laura, la tarjeta de
-- Guillermo decia «👁️ Datos visibles» y «CI: » vacio, con su cedula guardada en
-- la base.
--
-- Es la novena casilla decorativa del proyecto, y del lado contrario a las
-- otras ocho: la pantalla la respeta y la base ni la mira.
--
-- Decidido con el cliente el 30/09/2026 (REVISAR-A-OJO 74). El KT no dice nada
-- de esto, asi que la regla es la que la pantalla ya promete:
--
--   · lo tuyo, siempre;
--   · lo de quien comparte vivienda contigo, **solo si esa persona tiene el
--     interruptor encendido en esa vivienda**;
--   · y lo de cualquiera, para la porteria y la administracion del condominio
--     donde esa persona vive: el guardia compara el documento con la persona
--     que tiene delante, y eso es su trabajo.
--
-- Lo que **no** abre: una vivienda ajena. Compartir edificio no es compartir
-- casa, y el interruptor solo alcanza a quien vive con uno.

create or replace function public.puede_ver_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- El propio, siempre y sin condiciones.
    p_perfil_id = auth.uid()

    -- Quien comparte vivienda, si esa persona lo permite en esa vivienda.
    or exists (
      select 1
      from public.membresia_unidad suya
      join public.membresia_unidad mia
        on mia.unidad_id = suya.unidad_id
      where suya.usuario_id = p_perfil_id
        and suya.activo
        and suya.datos_visibles
        and mia.usuario_id = auth.uid()
        and mia.activo
    )

    -- La porteria y la administracion del condominio donde vive esa persona.
    or exists (
      select 1
      from public.membresia_unidad suya
      join public.unidad u on u.id = suya.unidad_id
      where suya.usuario_id = p_perfil_id
        and suya.activo
        and public.es_personal_condominio(u.condominio_id)
    );
$$;

comment on function public.puede_ver_perfil(uuid) is
  'Quien puede leer un perfil: uno mismo; quien comparte vivienda, si esa persona tiene datos_visibles en esa vivienda; y la porteria y administracion del condominio donde vive.';

revoke all on function public.puede_ver_perfil(uuid) from public;
grant execute on function public.puede_ver_perfil(uuid) to authenticated;

-- La escritura no se toca: sigue siendo `id = auth.uid()`, y `verificado` sigue
-- protegido por su disparador. Esto solo amplia la **lectura**.
drop policy if exists perfil_lectura_propia on public.perfil;
-- Y la nueva, por si esta migracion se vuelve a aplicar a mano: `create policy`
-- no tiene `or replace`, asi que sin esto la segunda pasada muere a medias.
drop policy if exists perfil_lectura on public.perfil;

create policy perfil_lectura on public.perfil
  for select
  using (public.puede_ver_perfil(id));
