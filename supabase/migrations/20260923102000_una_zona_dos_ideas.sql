-- ----------------------------------------------------------------------------
-- Tres columnas para dos ideas
-- ----------------------------------------------------------------------------
-- `zona_comun` tiene `restringida_huesped`, `permite_estancia_corta` y
-- `permite_estancia_larga`. Las dos primeras son la misma idea con la polaridad
-- invertida: "el huésped no puede usar esta zona" y "esta zona se permite para
-- estancias cortas" —y en este producto, estancia corta es el huésped—.
--
-- Y cada una estaba rota por su lado:
--
-- · `restringida_huesped` **la lee la política** (20260922197000) pero **no la
--   escribe ningún formulario**: no hay forma de marcar una zona como vedada
--   desde la aplicación.
-- · `permite_estancia_corta` y `permite_estancia_larga` **sí están en el
--   formulario** del administrador, con sus interruptores y su texto de ayuda
--   —"Define si esta zona puede ser usada por residentes de estancia corta"—
--   pero `haciaFila()` no las incluye en el `update`: se pintan, se cambian y
--   no se guardan.
--
-- Resultado: la casilla que funciona es invisible y las visibles no hacen nada.
--
-- Se consolida en el par que el administrador ya ve, y se elimina la tercera.
-- Primero se traslada el valor real, que vive en la columna que se va.

update public.zona_comun
   set permite_estancia_corta = not restringida_huesped
 where restringida_huesped;

comment on column public.zona_comun.permite_estancia_corta is
  'La zona se puede usar en una estancia corta, es decir por un huesped temporal. Sustituye a restringida_huesped, que era su negacion.';


-- El huésped reserva si la zona admite estancias cortas.
drop policy if exists reserva_zona_huesped_alta on public.reserva_zona;

create policy reserva_zona_huesped_alta on public.reserva_zona
  for insert to authenticated
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
    and public.estancia_cubre_fecha(unidad_id, fecha)
    and exists (
      select 1 from public.zona_comun z
      where z.id = zona_id
        and z.permite_estancia_corta
    )
  );

comment on policy reserva_zona_huesped_alta on public.reserva_zona is
  'Solo zonas que admitan estancias cortas, solo a su nombre y solo para un dia en que este alojado.';


-- Y el residente, si la zona admite estancias largas. La administracion
-- gestiona cualquiera: si no, no podria arreglar una reserva en una zona que
-- acaba de cerrar.
drop policy if exists reserva_zona_escritura on public.reserva_zona;

create policy reserva_zona_escritura on public.reserva_zona
  for all to authenticated
  using (
    (
      public.puede_operar_unidad(unidad_id)
      and exists (
        select 1 from public.zona_comun z
        where z.id = reserva_zona.zona_id and z.permite_estancia_larga
      )
    )
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and public.es_admin_condominio(z.condominio_id)
    )
  )
  with check (
    (
      public.puede_operar_unidad(unidad_id)
      and exists (
        select 1 from public.zona_comun z
        where z.id = reserva_zona.zona_id and z.permite_estancia_larga
      )
    )
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and public.es_admin_condominio(z.condominio_id)
    )
  );


alter table public.zona_comun drop column restringida_huesped;
